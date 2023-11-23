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
using System.Security.Cryptography;
using System.Runtime.InteropServices;

using NVault.Crypto.Secp256k1;

using VNLib.Utils;
using VNLib.Utils.Memory;

namespace NVault.Plugins.Vault
{
    internal sealed class NativeSecp256k1Library : VnDisposeable, INostrCryptoProvider
    {
        private readonly LibSecp256k1 _lib;

        private NativeSecp256k1Library(LibSecp256k1 lib)
        {
            _lib = lib;
        }

        /// <summary>
        /// Loads the native library from the specified path
        /// </summary>
        /// <param name="libFilePath">The library path</param>
        /// <param name="random">The optional random source</param>
        /// <returns>The loaded <see cref="NativeSecp256k1Library"/></returns>
        public static NativeSecp256k1Library LoadLibrary(string libFilePath, IRandomSource? random)
        {
            LibSecp256k1 lib = LibSecp256k1.LoadLibrary(libFilePath, DllImportSearchPath.SafeDirectories, random);
            return new(lib);
        }

        ///<inheritdoc/>
        public ERRNO DecryptMessage(ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> targetKey, ReadOnlySpan<byte> aesIv, ReadOnlySpan<byte> ciphterText, Span<byte> outputBuffer)
        {
            Check();
            //Start with new context
            using Secp256k1Context context = _lib.CreateContext();

            //Randomize context
            if (!context.Randomize())
            {
                return false;
            }

            //Get shared key
            byte[] sharedKeyBuffer = new byte[32];

            try
            {
                //Get the Secp256k1 shared key
                context.ComputeSharedKey(sharedKeyBuffer, targetKey, secretKey, HashFuncCallback, IntPtr.Zero);

                //Init the AES cipher
                using Aes aes = Aes.Create();
                aes.Key = sharedKeyBuffer;
                aes.Mode = CipherMode.CBC;

                return aes.DecryptCbc(ciphterText, aesIv, outputBuffer, PaddingMode.Zeros);
            }
            finally
            {
                //Zero out buffers
                MemoryUtil.InitializeBlock(sharedKeyBuffer.AsSpan());
            }
        }

        ///<inheritdoc/>
        public ERRNO EncryptMessage(ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> targetKey, ReadOnlySpan<byte> aesIv, ReadOnlySpan<byte> plainText, Span<byte> cipherText)
        {
            Check();
            //Start with new context
            using Secp256k1Context context = _lib.CreateContext();

            //Randomize context
            if (!context.Randomize())
            {
                return false;
            }

            //Get shared key
            byte[] sharedKeyBuffer = new byte[32];

            try
            {
                //Get the Secp256k1 shared key
                if(!context.ComputeSharedKey(sharedKeyBuffer, targetKey, secretKey, HashFuncCallback, IntPtr.Zero))
                {
                    return ERRNO.E_FAIL;
                }

                //Init the AES cipher
                using Aes aes = Aes.Create();
                aes.Key = sharedKeyBuffer;
                aes.Mode = CipherMode.CBC;

                return aes.EncryptCbc(plainText, aesIv, cipherText, PaddingMode.Zeros);
            }
            finally
            {
                //Zero out buffers
                MemoryUtil.InitializeBlock(sharedKeyBuffer.AsSpan());
            }
        }

        static int HashFuncCallback(in Secp256HashFuncState state)
        {
            //Get function args
            Span<byte> sharedKey = state.GetOutput();
            ReadOnlySpan<byte> xCoord = state.GetXCoordArg();

            //Nostr literally just uses the shared x coord as the shared key
            xCoord.CopyTo(sharedKey);

            return xCoord.Length;
        }

        //Key sizes are constant
        ///<inheritdoc/>
        public KeyBufferSizes GetKeyBufferSize() => new(LibSecp256k1.SecretKeySize, LibSecp256k1.XOnlyPublicKeySize);

        //Signature sizes are constant
        ///<inheritdoc/>
        public int GetSignatureBufferSize() => LibSecp256k1.SignatureSize;

        ///<inheritdoc/>
        public bool RecoverPublicKey(ReadOnlySpan<byte> privateKey, Span<byte> pubKey)
        {
            Check();

            //Init new context
            using Secp256k1Context context = _lib.CreateContext();

            //Randomize context
            if (!context.Randomize())
            {
                return false;
            }

            //Recover public key from the privatkey
            return context.GeneratePubKeyFromSecret(privateKey, pubKey) == LibSecp256k1.XOnlyPublicKeySize;
        }

        ///<inheritdoc/>
        public ERRNO SignMessage(ReadOnlySpan<byte> key, ReadOnlySpan<byte> digest, Span<byte> signatureBuffer)
        {
            Check();

            //Init new context
            using Secp256k1Context context = _lib.CreateContext();

            //Randomize context
            if (!context.Randomize())
            {
                return false;
            }

            //Sign the message
            return context.SchnorSignDigest(key, digest, signatureBuffer);
        }

        ///<inheritdoc/>
        public void GetRandomBytes(Span<byte> bytes) => _lib.GetRandomBytes(bytes);

        ///<inheritdoc/>
        public bool TryGenerateKeyPair(Span<byte> publicKey, Span<byte> privateKey)
        {
            //Trim buffers to the exact size required to avoid exceptions in the native lib
            privateKey = privateKey[..LibSecp256k1.SecretKeySize];
            publicKey = publicKey[..LibSecp256k1.XOnlyPublicKeySize];

            Check();

            //Init new context
            using Secp256k1Context context = _lib.CreateContext();

            //Randomize context
            if (!context.Randomize())
            {
                return false;
            }

            do
            {
                //Create the secret key and verify
                _lib.CreateSecretKey(privateKey);
            }
            while(context.VerifySecretKey(privateKey) == false);

            //Create the public key
            return context.GeneratePubKeyFromSecret(privateKey, publicKey) == LibSecp256k1.XOnlyPublicKeySize;
        }

        ///<inheritdoc/>
        protected override void Free()
        {
            _lib.Dispose();
        }

        
    }
}