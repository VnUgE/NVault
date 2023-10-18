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

using NVault.Crypto.Secp256k1;

using VNLib.Utils;

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
            LibSecp256k1 lib = LibSecp256k1.LoadLibrary(libFilePath, System.Runtime.InteropServices.DllImportSearchPath.SafeDirectories, random);
            return new(lib);
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