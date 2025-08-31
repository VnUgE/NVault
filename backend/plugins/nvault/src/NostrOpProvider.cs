// Copyright (C) 2024 Vaughn Nugent
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
using System.Text;
using System.Threading;
using System.Text.Json;
using System.Buffers.Text;
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
    internal sealed class NostrOpProvider(PluginBase plugin) : INostrOperations
    {
        private static readonly JavaScriptEncoder _encoder = GetJsEncoder();

        private readonly IKvVaultStore _vault = plugin.CreateService<ManagedVaultClient>();
        private readonly INostrKeyEncoder _keyEncoder = new Base64KeyEncoder();
        private readonly INostrCryptoProvider _cryptoProvider = plugin.CreateService<ManagedCryptoprovider>();

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
            MemoryUtil.InitializeBlock(ref buffHandle.GetReference(), buffHandle.GetIntLength());

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
                MemoryUtil.InitializeBlock(privKeyBuffer);
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
            using PrivateString? secret = await _vault.GetSecretAsync(scope, keyMeta.Id, cancellation);

            return secret != null && ComputeMessageSignature(evnt, secret);
        }

        private bool ComputeMessageSignature(NostrEvent evnt, ReadOnlySpan<char> secKey)
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

            //Set message id
            evnt.Id = ManagedHash.ComputeHash(ms.AsSpan(), HashAlg.SHA256, HashEncodingMode.Hexadecimal).ToLower();

            //Finally sign the message
            evnt.Signature = _cryptoProvider.SignData(secKey, ms.AsSpan());

            return true;
        }

        private static JavaScriptEncoder GetJsEncoder()
        {
            TextEncoderSettings s = new();

            s.AllowCharacters('+');

            return JavaScriptEncoder.Create(s);
        }

        ///<inheritdoc/>
        public async Task<string?> EncryptNoteAsync(
            VaultUserScope scope, 
            NostrKeyMeta keyMeta,
            NoteCipherArgs args,
            CancellationToken cancellation
        )
        {
            //Convert the plaintext string data to binary format
            int ptSize = Encoding.UTF8.GetByteCount(args.InputText);
            using UnsafeMemoryHandle<byte> inputTextBuffer = MemoryUtil.UnsafeAllocNearestPage(ptSize, false);

            ptSize = Encoding.UTF8.GetBytes(args.InputText, inputTextBuffer.Span);

            try
            {
                //Get key data from the vault (key should always exist, but may get out of sync if manually deleted)
                using PrivateString? secret = await _vault.GetSecretAsync(scope, keyMeta.Id, cancellation)
                    ?? throw new ArgumentException("Secret key not found in vault");

                string? outputText = null;

                bool result = EncyrptMessage(
                    args.Version,
                    vaultKey: secret.ToReadOnlySpan(),
                    args.TargetPubKey,
                    inputText: inputTextBuffer.AsSpan(0, ptSize),
                    ref outputText
                );

                //Call encipher method
                return result ? outputText : throw new CryptographicException("Failed to encipher the target data");
            }
            finally
            {
                //Wipe our copy of the private plaintext text
                MemoryUtil.InitializeBlock(
                    ref inputTextBuffer.GetReference(), 
                    inputTextBuffer.IntLength
                );
            }
        }

        private bool EncyrptMessage(
            NostrCipherVersion version,
            ReadOnlySpan<char> vaultKey,
            ReadOnlySpan<char> targetPubKeyHex,
            ReadOnlySpan<byte> inputText, 
            ref string? outputText
        )
        {
            int secKeyBufSize = _keyEncoder.GetKeyBufferSize(vaultKey);
            using UnsafeMemoryHandle<byte> seckeyBuffer = MemoryUtil.UnsafeAllocNearestPage(secKeyBufSize, zero: true);

            try
            {
                ERRNO keySize = _keyEncoder.DecodeKey(vaultKey, seckeyBuffer.Span);
                if(keySize < 1)
                {
                    return false;
                }

                //Recover target public key
                byte[] targetPubkey = Convert.FromHexString(targetPubKeyHex);

                return CipherUpdate(
                    isEncrypting: true,
                    version,
                    secretKey: seckeyBuffer.AsSpan(0, (int)keySize),
                    pubKey: targetPubkey.AsSpan(),
                    inputText: inputText,
                    outputText: ref outputText
                );
            }
            finally
            {
                MemoryUtil.InitializeBlock(
                    ref seckeyBuffer.GetReference(), 
                    seckeyBuffer.IntLength
                );
            }
        }

        private bool CipherUpdate(
            bool isEncrypting,
            NostrCipherVersion version,
            ReadOnlySpan<byte> secretKey,
            ReadOnlySpan<byte> pubKey,
            ReadOnlySpan<byte> inputText,
            ref string? outputText
        )
        {
            //Create a one-shot encryption cipher
            using INostrCipher cipher = _cryptoProvider.GetMessageCipher(version, isEncrypting);

            cipher.Update(secretKey, pubKey, inputText);

            //Pepare the output buffer
            int outputSize = cipher.GetOutputSize();
            if(outputSize < 1)
            {
                return false;
            }

            //Alloc output binary buffer
            using UnsafeMemoryHandle<byte> outputBuffer = MemoryUtil.UnsafeAllocNearestPage(outputSize, zero: false);

            int readSize = cipher.Read(outputBuffer.Span);
            if (readSize < 1)
            {
                return false;
            }

            //Output text is the ciphertext base64 utf8 encoded
            outputText = Convert.ToBase64String(outputBuffer.AsSpan(0, readSize), Base64FormattingOptions.None);
            return true;
        }
    }
}
