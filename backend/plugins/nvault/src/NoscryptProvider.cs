// Copyright (C) 2025 Vaughn Nugent
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

using VNLib.Utils;
using VNLib.Utils.Memory;
using VNLib.Utils.Extensions;
using VNLib.Hashing;

using VNLib.Utils.Cryptography.Noscrypt;
using VNLib.Utils.Cryptography.Noscrypt.Random;
using VNLib.Utils.Cryptography.Noscrypt.Encryption;
using VNLib.Utils.Cryptography.Noscrypt.Signatures;

namespace NVault.Plugins.Vault
{
    internal sealed class NoscryptProvider(IRandomSource random, Noscrypt noscrypt, NCContext context) 
        : VnDisposeable, INostrCryptoProvider
    {
        private readonly NCContext _context = context;
        private readonly NCSigner _signer = new (context, random);
        private readonly IRandomSource _random = random;

        ///<inheritdoc/>
        public KeyBufferSizes GetKeyBufferSize()
        {
            return new()
            {
                PrivateKeySize = NCSecretKey.Size,
                PublicKeySize = NCPublicKey.Size
            };
        }

        ///<inheritdoc/>
        public void GetRandomBytes(Span<byte> bytes) => _random.GetRandomBytes(bytes);

        ///<inheritdoc/>
        public int GetSignatureBufferSize() => Noscrypt.NC_SIGNATURE_SIZE;

        ///<inheritdoc/>
        public bool RecoverPublicKey(ReadOnlySpan<byte> privateKey, Span<byte> pubKey)
        {
            ArgumentOutOfRangeException.ThrowIfLessThan(privateKey.Length, NCSecretKey.Size, nameof(privateKey));
            ArgumentOutOfRangeException.ThrowIfLessThan(pubKey.Length, NCPublicKey.Size, nameof(pubKey));

            NCKeyUtil.GetPublicKey(
                _context,
                in NCKeyUtil.AsSecretKey(privateKey),
                ref NCKeyUtil.AsPublicKey(pubKey)
            );

            return true;
        }

        ///<inheritdoc/>
        public ERRNO SignData(ReadOnlySpan<byte> key, ReadOnlySpan<byte> data, Span<byte> signatureBuffer)
        {
            _signer.SignData(in NCKeyUtil.AsSecretKey(key), data, signatureBuffer);

            return Noscrypt.NC_SIGNATURE_SIZE;
        }

        ///<inheritdoc/>
        public string SignData(ReadOnlySpan<char> secretKey, ReadOnlySpan<byte> data)
        {
            return _signer.SignData(secretKey, data, NCHexSignatureEncoder.Instance);
        }

        ///<inheritdoc/>
        public bool TryGenerateKeyPair(Span<byte> publicKey, Span<byte> privateKey)
        {
            ArgumentOutOfRangeException.ThrowIfLessThan(privateKey.Length, NCSecretKey.Size, nameof(privateKey));
            ArgumentOutOfRangeException.ThrowIfLessThan(publicKey.Length, NCPublicKey.Size, nameof(publicKey));

            ref readonly NCSecretKey asSecretKey = ref NCKeyUtil.AsSecretKey(privateKey);
            ref NCPublicKey asPubKey = ref NCKeyUtil.AsPublicKey(publicKey);

            GetRandomBytes(privateKey);

            if (NCKeyUtil.ValidateSecretKey(_context, in asSecretKey))
            {
                //Generate the public key after secret key is validated
                NCKeyUtil.GetPublicKey(_context, in asSecretKey, ref asPubKey);
                return true;
            }
            
            return false;
        }

        ///<inheritdoc/>
        public INostrCipher GetMessageCipher(NostrCipherVersion version, bool isEncrypting)
        {
            NCCipherFlags flags = isEncrypting ? NCCipherFlags.EncryptDefault : NCCipherFlags.DecryptDefault;
            NCCipherVersion cipherVersion = GetCipherVersion(version);

            //Init new noscrypt cipher
            NCMessageCipher cipher = NCMessageCipher.Create(_context, cipherVersion, flags);

            //Generate a new IV for encryption
            if (isEncrypting)
            {
                cipher.SetRandomIv(_random);
            }

            return new NoscryptCipher(cipher);
        }

        private static NCCipherVersion GetCipherVersion(NostrCipherVersion cv)
        {
            return cv switch
            {
                NostrCipherVersion.Nip04 => NCCipherVersion.Nip04,
                NostrCipherVersion.Nip44 => NCCipherVersion.Nip44,
                _ => throw new NotSupportedException("The specified cipher version is not supported.")
            };
        }

        ///<inheritdoc/>
        protected override void Free()
        {
            _context.Dispose();
            noscrypt.Dispose();
        }


        public static NoscryptProvider LoadLibrary(string libPath, IRandomSource? random, IUnmangedHeap heap)
        {
            //Fallback to platform random crypto
            random ??= new PlatformRandom();

            Noscrypt lib = Noscrypt.LoadLibrary(libPath);

            try
            {
                NCContext ctx = lib.AllocContext(random, heap);

                return new NoscryptProvider(random, lib, ctx);
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

        private sealed class NoscryptCipher(NCMessageCipher cipher) : VnDisposeable, INostrCipher
        {
            ///<inheritdoc/>
            public int GetOutputSize() => cipher.GetOutputSize();

            ///<inheritdoc/>
            public int Read(Span<byte> outputBuffer)
            {
                cipher.ThrowIfClosed();
                return cipher.ReadOutput(outputBuffer);
            }

            ///<inheritdoc/>
            public int GetIvSize() => cipher.GetIvSize();

            ///<inheritdoc/>
            public void ReadIv(Span<byte> ivBuffer) => cipher.IvBuffer.CopyTo(ivBuffer);

            ///<inheritdoc/>
            public void SetIv(ReadOnlySpan<byte> iv) => iv.CopyTo(cipher.IvBuffer);

            ///<inheritdoc/>
            public void Update(
                ReadOnlySpan<byte> secretKey, 
                ReadOnlySpan<byte> targetKey, 
                ReadOnlySpan<byte> inputData
            )
            {
                cipher.ThrowIfClosed();

                ref readonly NCSecretKey secKey = ref NCKeyUtil.AsSecretKey(secretKey);
                ref readonly NCPublicKey target = ref NCKeyUtil.AsPublicKey(targetKey);

                cipher.Update(in secKey, in target, inputData);
            }

            ///<inheritdoc/>
            protected override void Free()
            {
                cipher.Dispose();
            }
        }
    }
}