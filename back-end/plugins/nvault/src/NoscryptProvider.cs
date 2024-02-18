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

using NVault.Crypto.Noscrypt;

using VNLib.Utils;
using VNLib.Utils.Memory;
using VNLib.Hashing;


namespace NVault.Plugins.Vault
{
    internal sealed class NoscryptProvider(IRandomSource random, NostrCrypto noscrypt) : VnDisposeable, INostrCryptoProvider
    {
        const int MaxInvalidSecKeyAttempts = 10;

        ///<inheritdoc/>
        public ERRNO DecryptMessage(ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> targetKey, ReadOnlySpan<byte> aseIv, ReadOnlySpan<byte> cyphterText, Span<byte> outputBuffer)
        {
            return false;
        }

        ///<inheritdoc/>
        public ERRNO EncryptMessage(ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> targetKey, ReadOnlySpan<byte> aesIv, ReadOnlySpan<byte> plainText, Span<byte> cipherText)
        {
            return false;
        }

        ///<inheritdoc/>
        public KeyBufferSizes GetKeyBufferSize()
        {
            return new()
            {
                PrivateKeySize = LibNoscrypt.NC_SEC_KEY_SIZE,
                PublicKeySize = LibNoscrypt.NC_SEC_PUBKEY_SIZE
            };
        }

        ///<inheritdoc/>
        public void GetRandomBytes(Span<byte> bytes) => random.GetRandomBytes(bytes);

        ///<inheritdoc/>
        public int GetSignatureBufferSize() => LibNoscrypt.NC_SIGNATURE_SIZE;

        ///<inheritdoc/>
        public bool RecoverPublicKey(ReadOnlySpan<byte> privateKey, Span<byte> pubKey)
        {
            ArgumentOutOfRangeException.ThrowIfLessThan(privateKey.Length, LibNoscrypt.NC_SEC_KEY_SIZE, nameof(privateKey));
            ArgumentOutOfRangeException.ThrowIfLessThan(pubKey.Length, LibNoscrypt.NC_SEC_PUBKEY_SIZE, nameof(pubKey));

            noscrypt.GetPublicKey(
                in NCUtil.AsSecretKey(privateKey), 
                ref NCUtil.AsPublicKey(pubKey)
            );

            return true;
        }

        ///<inheritdoc/>
        public ERRNO SignData(ReadOnlySpan<byte> key, ReadOnlySpan<byte> data, Span<byte> signatureBuffer)
        {
            //Get a buffer of message entropy for libnoscrypt
            Span<byte> entropy = stackalloc byte[32];
            random.GetRandomBytes(entropy);

            ref readonly NCSecretKey secretKey = ref NCUtil.AsSecretKey(key);
            noscrypt.SignData(in secretKey, entropy, data, signatureBuffer);

            return LibNoscrypt.NC_SIGNATURE_SIZE;
        }

        ///<inheritdoc/>
        public bool TryGenerateKeyPair(Span<byte> publicKey, Span<byte> privateKey)
        {
            ArgumentOutOfRangeException.ThrowIfLessThan(privateKey.Length, LibNoscrypt.NC_SEC_KEY_SIZE, nameof(privateKey));
            ArgumentOutOfRangeException.ThrowIfLessThan(publicKey.Length, LibNoscrypt.NC_SEC_PUBKEY_SIZE, nameof(publicKey));

            ref readonly NCSecretKey asSecretKey = ref NCUtil.AsSecretKey(privateKey);
            ref NCPublicKey asPubKey = ref NCUtil.AsPublicKey(publicKey);

            int loopCount = 0;

            random.GetRandomBytes(privateKey);

            //Validate the secret key data
            while (noscrypt.ValidateSecretKey(in asSecretKey) == false)
            {
                if(loopCount++ > MaxInvalidSecKeyAttempts)
                {
                    return false;
                }

                //Try to get random key again
                random.GetRandomBytes(privateKey);
            }

            //Generate the public key after secret key is validated
            noscrypt.GetPublicKey(in asSecretKey, ref asPubKey);
            return true;
        }

        ///<inheritdoc/>
        protected override void Free() => noscrypt.Dispose();


        public static NoscryptProvider LoadLibrary(string libPath, IRandomSource? random, IUnmangedHeap heap)
        {
            //Fallback to platform random crypto
            random ??= new PlatformRandom();

            LibNoscrypt lib = LibNoscrypt.Load(libPath);

            try
            {
                Span<byte> entropy = stackalloc byte[LibNoscrypt.CTX_ENTROPY_SIZE];
                random.GetRandomBytes(entropy);

                NostrCrypto nostr = lib.InitializeCrypto(heap, entropy);
                return new NoscryptProvider(random, nostr);
            }
            catch
            {
                lib.Dispose();
                throw;
            }
        }

        sealed class PlatformRandom() : IRandomSource
        {
            ///<inheritdoc/>
            public void GetRandomBytes(Span<byte> buffer) => RandomHash.GetRandomBytes(buffer);
        }
    }
}