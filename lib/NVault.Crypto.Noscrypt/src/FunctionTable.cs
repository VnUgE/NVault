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

using VNLib.Utils.Extensions;
using VNLib.Utils.Native;

using NCResult = System.Int64;

namespace NVault.Crypto.Noscrypt
{
    internal unsafe readonly struct FunctionTable
    {

        public readonly NCGetContextStructSizeDelegate NCGetContextStructSize;
        public readonly NCInitContextDelegate NCInitContext;
        public readonly NCReInitContextDelegate NCReInitContext;
        public readonly NCDestroyContextDelegate NCDestroyContext;
        public readonly NCGetPublicKeyDelegate NCGetPublicKey;
        public readonly NCValidateSecretKeyDelegate NCValidateSecretKey;
        public readonly NCSignDataDelegate NCSignData;
        public readonly NCVerifyDataDelegate NCVerifyData;
        public readonly NCEncryptDelegate NCEncrypt;
        public readonly NCDecryptDelegate NCDecrypt;

        private FunctionTable(SafeLibraryHandle library)
        {
            //Load the required high-level api functions
            NCGetContextStructSize = library.DangerousGetMethod<NCGetContextStructSizeDelegate>();
            NCInitContext = library.DangerousGetMethod<NCInitContextDelegate>();
            NCReInitContext = library.DangerousGetMethod<NCReInitContextDelegate>();
            NCDestroyContext = library.DangerousGetMethod<NCDestroyContextDelegate>();
            NCGetPublicKey = library.DangerousGetMethod<NCGetPublicKeyDelegate>();
            NCValidateSecretKey = library.DangerousGetMethod<NCValidateSecretKeyDelegate>();
            NCSignData = library.DangerousGetMethod<NCSignDataDelegate>();
            NCVerifyData = library.DangerousGetMethod<NCVerifyDataDelegate>();
            NCSignData = library.DangerousGetMethod<NCSignDataDelegate>();
            NCVerifyData = library.DangerousGetMethod<NCVerifyDataDelegate>();
            NCEncrypt = library.DangerousGetMethod<NCEncryptDelegate>();
            NCDecrypt = library.DangerousGetMethod<NCDecryptDelegate>();
        }

        /// <summary>
        /// Initialize a new function table from the specified library
        /// </summary>
        /// <param name="library"></param>
        /// <returns>The function table structure</returns>
        /// <exception cref="MissingMemberException"></exception>
        /// <exception cref="EntryPointNotFoundException"></exception>
        public static FunctionTable BuildFunctionTable(SafeLibraryHandle library) => new (library);

        //FUCNTIONS
        [SafeMethodName("NCGetContextStructSize")]
        internal delegate uint NCGetContextStructSizeDelegate();

        [SafeMethodName("NCInitContext")]
        internal delegate NCResult NCInitContextDelegate(IntPtr ctx, byte* entropy32);

        [SafeMethodName("NCReInitContext")]
        internal delegate NCResult NCReInitContextDelegate(IntPtr ctx, byte* entropy32);

        [SafeMethodName("NCDestroyContext")]
        internal delegate NCResult NCDestroyContextDelegate(IntPtr ctx);

        [SafeMethodName("NCGetPublicKey")]
        internal delegate NCResult NCGetPublicKeyDelegate(IntPtr ctx, NCSecretKey* secKey, NCPublicKey* publicKey);

        [SafeMethodName("NCValidateSecretKey")]
        internal delegate NCResult NCValidateSecretKeyDelegate(IntPtr ctx, NCSecretKey* secKey);

        [SafeMethodName("NCSignData")]
        internal delegate NCResult NCSignDataDelegate(IntPtr ctx, NCSecretKey* sk, byte* random32, byte* data, nint dataSize, byte* sig64);

        [SafeMethodName("NCVerifyData")]
        internal delegate NCResult NCVerifyDataDelegate(IntPtr ctx, NCPublicKey* sk, byte* data, nint dataSize, byte* sig64);

        [SafeMethodName("NCEncrypt")]
        internal delegate NCResult NCEncryptDelegate(IntPtr ctx, NCSecretKey* sk, NCPublicKey* pk, NCCryptoData* data);

        [SafeMethodName("NCDecrypt")]
        internal delegate NCResult NCDecryptDelegate(IntPtr ctx, NCSecretKey* sk, NCPublicKey* pk, NCCryptoData* data);
    }
}
