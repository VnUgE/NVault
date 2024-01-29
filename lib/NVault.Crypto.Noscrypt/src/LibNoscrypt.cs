using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

using VNLib.Utils;
using VNLib.Utils.Extensions;
using VNLib.Utils.Native;

using NCResult = System.Int64;

namespace NVault.Crypto.Noscrypt
{
    public unsafe sealed class LibNoscrypt(SafeLibraryHandle Library, bool OwnsHandle) : VnDisposeable
    {
        //Values that match the noscrypt.h header
        public const int NC_SEC_KEY_SIZE = 32;
        public const int NC_SEC_PUBKEY_SIZE = 32;
        public const int NC_ENCRYPTION_NONCE_SIZE = 32;
        public const int NC_PUBKEY_SIZE = 32;
        public const int NC_SIGNATURE_SIZE = 64;
        public const int NC_CONV_KEY_SIZE = 32;
        public const int NC_MESSAGE_KEY_SIZE = 32;
        public const int CTX_ENTROPY_SIZE = 32;

        //STRUCTS MUST MATCH THE NOSCRYPT.H HEADER

        [StructLayout(LayoutKind.Sequential, Size = NC_SEC_KEY_SIZE)]
        internal struct NCSecretKey
        {
            public fixed byte key[NC_SEC_KEY_SIZE];
        }

        [StructLayout(LayoutKind.Sequential, Size = NC_SEC_PUBKEY_SIZE)]
        internal struct NCPublicKey
        {
            public fixed byte key[NC_SEC_PUBKEY_SIZE];
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct NCCryptoData
        {
            public fixed byte nonce[NC_ENCRYPTION_NONCE_SIZE];
            public void* inputData;
            public void* outputData;
            public uint dataSize;
        }

        //FUCNTIONS
        [SafeMethodName("NCGetContextStructSize")]
        internal delegate uint NCGetContextStructSizeDelegate();

        [SafeMethodName("NCInitContext")]
        internal delegate NCResult NCInitContextDelegate(void* ctx , byte* entropy32);

        [SafeMethodName("NCReInitContext")]
        internal delegate NCResult NCReInitContextDelegate(void* ctx, byte* entropy32);

        [SafeMethodName("NCDestroyContext")]
        internal delegate NCResult NCDestroyContextDelegate(void* ctx);

        [SafeMethodName("NCGetPublicKey")]
        internal delegate NCResult NCGetPublicKeyDelegate(void* ctx, NCSecretKey* secKey, NCPublicKey* publicKey);

        [SafeMethodName("NCValidateSecretKey")]
        internal delegate NCResult NCValidateSecretKeyDelegate(void* ctx, NCSecretKey* secKey);

        [SafeMethodName("NCSignData")]
        internal delegate NCResult NCSignDataDelegate(void* ctx, NCSecretKey* secKey, byte* random32, byte* data, long dataSize, byte* sig64);

        [SafeMethodName("NCVerifyData")]
        internal delegate NCResult NCVerifyDataDelegate(void* ctx, NCPublicKey* pubKey, byte* data, long dataSize, byte* sig64);

        [SafeMethodName("NCSignDigest")]
        internal delegate NCResult NCSignDigestDelegate(void* ctx, NCSecretKey* secKey, byte* random32, byte* digest32, byte* sig64);

        [SafeMethodName("NCVerifyDigest")]
        internal delegate NCResult NCVerifyDigestDelegate(void* ctx, NCPublicKey* pubKey, byte* digest32, byte* sig64);




        ///<inheritdoc/>
        protected override void Free()
        {
            if (OwnsHandle)
            {
                Library.Dispose();
            }
        }

        public static LibNoscrypt Load(string path, DllImportSearchPath search)
        {
            //Load the native library
            SafeLibraryHandle handle = SafeLibraryHandle.LoadLibrary(path, search);

            //Create the wrapper
            return new LibNoscrypt(handle, true);
        }

        public static LibNoscrypt Load(string path) => Load(path, DllImportSearchPath.SafeDirectories);


    }
}
