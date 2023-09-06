// Copyright (C) 2023 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

using System;
using System.Threading;
using System.Text.Json;
using System.Threading.Tasks;
using System.Text.Encodings.Web;
using System.Security.Cryptography;

using NVault.VaultExtensions;

using VNLib.Hashing;
using VNLib.Utils;
using VNLib.Utils.IO;
using VNLib.Utils.Memory;
using VNLib.Utils.Extensions;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

using NVault.Plugins.Vault.Model;

namespace NVault.Plugins.Vault
{
    internal sealed class NostrOpProvider : INostrOperations
    {
        private static JavaScriptEncoder _encoder { get; } = GetJsEncoder();

        readonly IKvVaultStore _vault;
        readonly INostrKeyEncoder _keyEncoder;
        readonly INostrCryptoProvider _cryptoProvider;

        public NostrOpProvider(PluginBase plugin)
        {
            //Use base64 key encoder
            _keyEncoder = new Base64KeyEncoder();

            //Setup crypto provider 
            _cryptoProvider = plugin.CreateService<ManagedCryptoprovider>();

            //Get the vault
            _vault = plugin.CreateService<ManagedVaultClient>();
        }

        ///<inheritdoc/>
        public Task<bool> CreateCredentialAsync(VaultUserScope scope, NostrKeyMeta newKey, CancellationToken cancellation)
        {
            //Calculate the required buffer size
            KeyBufferSizes bufSizes = _cryptoProvider.GetKeyBufferSize();

            //Alloc the buffer
            using IMemoryHandle<byte> buffHandle = MemoryUtil.SafeAllocNearestPage(bufSizes.PublicKeySize + bufSizes.PrivateKeySize, true);

            //Breakup buffers
            Span<byte> privKey = buffHandle.Span[..bufSizes.PrivateKeySize];
            Span<byte> pubKey = buffHandle.Span[bufSizes.PrivateKeySize..];

            //Generate the keypair
            bool err = _cryptoProvider.TryGenerateKeyPair(pubKey, privKey);

            if (!err)
            {
                return Task.FromResult(false);
            }

            //Trim the buffers
            privKey = privKey[..bufSizes.PrivateKeySize];
            pubKey = pubKey[..bufSizes.PublicKeySize];

            //Encode the private key
            PrivateString? privateKey = (PrivateString?)_keyEncoder.EncodeKey(privKey);

            //Public key is hexadecimal (lowercase)
            newKey.Value = Convert.ToHexString(pubKey).ToLower();

            //Zero the buffers
            MemoryUtil.InitializeBlock(buffHandle.Span);

            if (privateKey == null)
            {
                return Task.FromResult(false);
            }

            //Store the keypair in the vault
            return StorePivKeyAsync(scope, newKey, privateKey, cancellation);
        }

        ///<inheritdoc/
        public Task<bool> CreateFromExistingAsync(VaultUserScope scope, NostrKeyMeta newKey, string hexKey, CancellationToken cancellation)
        {
            //Calculate the required buffer size
            KeyBufferSizes bufSizes = _cryptoProvider.GetKeyBufferSize();

            Span<byte> pubkeyBuffer = stackalloc byte[bufSizes.PublicKeySize];

            //Recover the private key from the hex string
            byte[] privKeyBuffer = Convert.FromHexString(hexKey);

            try
            {
                //Recover keypair from private key
                if (!_cryptoProvider.RecoverPublicKey(privKeyBuffer, pubkeyBuffer))
                {
                    return Task.FromResult(false);
                }

                //Encode the private key
                PrivateString? privateKey = (PrivateString?)_keyEncoder.EncodeKey(privKeyBuffer);

                if (privateKey == null)
                {
                    return Task.FromResult(false);
                }

                //Public key is hexadecimal (lowercase)
                newKey.Value = Convert.ToHexString(pubkeyBuffer).ToLower();

                //Store the keypair in the vault
                return StorePivKeyAsync(scope, newKey, privateKey, cancellation);
            }
            finally
            {
                //Always zero the private key buffer
                MemoryUtil.InitializeBlock(privKeyBuffer.AsSpan());
            }
        }

        private async Task<bool> StorePivKeyAsync(VaultUserScope scope, NostrKeyMeta meta, PrivateString key, CancellationToken cancellation)
        {
            //Store the key in the vault
            await _vault.SetSecretAsync(scope, meta.Id, key, cancellation);

            //Erase the key
            key.Erase();

            return true;
        }

        ///<inheritdoc/>
        public Task DeleteCredentialAsync(VaultUserScope scope, NostrKeyMeta key, CancellationToken cancellation) => _vault.DeleteSecretAsync(scope, key.Id, cancellation);

        ///<inheritdoc/>
        public async Task<bool> SignEventAsync(VaultUserScope scope, NostrKeyMeta keyMeta, NostrEvent evnt, CancellationToken cancellation)
        {
            //Get key data from the vault
            PrivateString? secret = await _vault.GetSecretAsync(scope, keyMeta.Id, cancellation);

            return secret != null && SignMessage(secret, evnt);
        }

        private bool SignMessage(PrivateString vaultKey, NostrEvent ev)
        {
            //Decode the key
            int keyBufSize = _keyEncoder.GetKeyBufferSize(vaultKey);

            //Get the signature buffer size
            int sigBufSize = _cryptoProvider.GetSignatureBufferSize();

            //Alloc key buffer
            using IMemoryHandle<byte> buffHandle = MemoryUtil.SafeAllocNearestPage(keyBufSize + sigBufSize, true);

            //Wrap the buffer
            EvBuffer buffer = new(buffHandle, keyBufSize, sigBufSize, (int)HashAlg.SHA256);

            try
            {
                //Decode the key
                ERRNO keySize = _keyEncoder.DecodeKey(vaultKey, buffer.KeyBuffer);

                if (!keySize)
                {
                    return false;
                }

                //Get the event id/event digest from the event
                GetNostrEventId(ev, buffer.HashBuffer);

                //Store the event id
                ev.Id = Convert.ToHexString(buffer.HashBuffer).ToLower();

                //Sign the event
                ERRNO sigSize = _cryptoProvider.SignMessage(buffer.KeyBuffer[..(int)keySize], buffer.HashBuffer, buffer.SigBuffer);

                if (!sigSize)
                {
                    return false;
                }

                //Store the signature as loewrcase hex
                ev.Signature = Convert.ToHexString(buffer.SigBuffer[..(int)sigSize]).ToLower();
                return true;
            }
            finally
            {
                //Zero the key buffer and key
                MemoryUtil.InitializeBlock(buffHandle.Span);
                vaultKey.Erase();
            }
        }

        private void GetNostrEventId(NostrEvent evnt, Span<byte> idHash)
        {

            JsonWriterOptions options = new()
            {
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                Indented = false,
                MaxDepth = 4
            };

            using VnMemoryStream ms = new();
            using (Utf8JsonWriter writer = new(ms, options))
            {
                //Start the array
                writer.WriteStartArray();

                //Write 0 to start the array
                writer.WriteNumberValue(0);

                //We need the public key to be lower case
                Span<char> lower = stackalloc char[evnt.PublicKey!.Length];
                evnt.PublicKey.AsSpan().ToLowerInvariant(lower);

                //Write public key, which is hex encoded
                writer.WriteStringValue(lower);

                //Created-at time
                writer.WriteNumberValue(evnt.Timestamp!.Value);

                //Kind (as number)
                writer.WriteNumberValue((int)evnt.MessageKind!.Value);

                //tags (as array of strings)
                JsonSerializer.Serialize(writer, evnt.Tags);

                //Content as a string
                writer.WriteStringValue(evnt.Content);

                //End the array
                writer.WriteEndArray();
            }

            string raw = System.Text.Encoding.UTF8.GetString(ms.AsSpan());

            //Compute the hash
            if (!ManagedHash.ComputeHash(ms.AsSpan(), idHash, HashAlg.SHA256))
            {
                throw new CryptographicException("Failed to compute event data hash");
            }
        }

        private static JavaScriptEncoder GetJsEncoder()
        {
            TextEncoderSettings s = new();

            s.AllowCharacters('+');

            return JavaScriptEncoder.Create(s);
        }

        readonly record struct EvBuffer(IMemoryHandle<byte> Handle, int KeySize, int SigSize, int HashSize)
        {
            public readonly Span<byte> KeyBuffer => Handle.Span[..KeySize];

            public readonly Span<byte> SigBuffer => Handle.AsSpan(KeySize, SigSize);

            public readonly Span<byte> HashBuffer => Handle.AsSpan(KeySize + SigSize, HashSize);
        }
    }
}
