﻿// Copyright (C) 2023 Vaughn Nugent
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
using System.Runtime.InteropServices;

using VNLib.Hashing;
using VNLib.Utils;
using VNLib.Utils.Native;
using VNLib.Utils.Extensions;

namespace NVault.Crypto.Secp256k1
{

    public unsafe class LibSecp256k1 : VnDisposeable
    {
        public const int SecretKeySize = 32;
        public const int XOnlyPublicKeySize = 32;
        public const int SignatureSize = 64;
        public const int KeyPairSize = 96;
        public const int RandomBufferSize = 32;

        /*
         * Unsafe structures that represent the native keypair and x-only public key
         * structures. They hold character arrays
         */
        [StructLayout(LayoutKind.Sequential)]
        internal struct KeyPair
        {
            public fixed byte data[Length];
            public const int Length = KeyPairSize;
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct XOnlyPubKey
        {
            public fixed byte data[Length];
            public const int Length = 64;
        }

        //Native methods
        [SafeMethodName("secp256k1_context_create")]
        internal delegate IntPtr CreateContext(int flags);

        [SafeMethodName("secp256k1_context_destroy")]
        internal delegate void DestroyContext(IntPtr context);

        [SafeMethodName("secp256k1_context_randomize")]
        internal delegate int RandomizeContext(IntPtr context, byte* seed32);

        [SafeMethodName("secp256k1_keypair_create")]
        internal delegate int KeypairCreate(IntPtr context, KeyPair* keyPair, byte* secretKey);

        [SafeMethodName("secp256k1_keypair_xonly_pub")]
        internal delegate int KeypairXOnlyPub(IntPtr ctx, XOnlyPubKey* pubkey, int pk_parity, KeyPair* keypair);

        [SafeMethodName("secp256k1_xonly_pubkey_serialize")]
        internal delegate int XOnlyPubkeySerialize(IntPtr ctx, byte* output32, XOnlyPubKey* pubkey);

        [SafeMethodName("secp256k1_schnorrsig_sign32")]
        internal delegate int SignHash(IntPtr ctx, byte* sig64, byte* msg32, KeyPair* keypair, byte* aux_rand32);

        /// <summary>
        /// Loads the Secp256k1 library from the specified path and creates a wrapper class (loads methods from the library)
        /// </summary>
        /// <param name="dllPath">The realtive or absolute path to the shared library</param>
        /// <param name="search">The DLL probing path pattern</param>
        /// <returns>The <see cref="LibSecp256k1"/> library wrapper class</returns>
        /// <exception cref="DllNotFoundException"></exception>
        /// <exception cref="ArgumentNullException"></exception>
        /// <exception cref="MissingMemberException"></exception>
        /// <exception cref="EntryPointNotFoundException"></exception>
        public static LibSecp256k1 LoadLibrary(string dllPath, DllImportSearchPath search, IRandomSource? random)
        {
            _ = dllPath?? throw new ArgumentNullException(nameof(dllPath));

            //try to load the library
            SafeLibraryHandle lib = SafeLibraryHandle.LoadLibrary(dllPath, search);

            //try to create the wrapper class, if it fails, dispose the library
            try
            {
                //setup fallback random source if null
                random ??= new FallbackRandom();

                //Create the lib
                return new LibSecp256k1(lib, random);
            }
            catch
            {
                //Dispose the library if the creation failed
                lib.Dispose();
                throw;
            }
        }

        /// <summary>
        /// The underlying library handle
        /// </summary>
        public SafeLibraryHandle SafeLibHandle { get; }

        internal readonly KeypairCreate _createKeyPair;
        internal readonly CreateContext _create;
        internal readonly RandomizeContext _randomize;
        internal readonly DestroyContext _destroy;
        internal readonly KeypairXOnlyPub _createXonly;
        internal readonly XOnlyPubkeySerialize _serializeXonly;
        internal readonly SignHash _signHash;
        private readonly IRandomSource _randomSource;

        /// <summary>
        /// Creates a new instance of the <see cref="LibSecp256k1"/> class from the specified library handle
        /// </summary>
        /// <param name="handle">The library handle that referrences the secp256k1 platform specific library</param>
        /// <remarks>
        /// This method attempts to capture all the native methods from the library, which may throw if the library is not valid.
        /// </remarks>
        /// <exception cref="ArgumentNullException"></exception>
        /// <exception cref="MissingMemberException"></exception>
        /// <exception cref="EntryPointNotFoundException"></exception>
        public LibSecp256k1(SafeLibraryHandle handle, IRandomSource randomSource)
        {
            //Store library handle
            SafeLibHandle = handle ?? throw new ArgumentNullException(nameof(handle));

            //Get all method handles and store them
            _create = handle.DangerousGetMethod<CreateContext>();
            _createKeyPair = handle.DangerousGetMethod<KeypairCreate>();
            _randomize = handle.DangerousGetMethod<RandomizeContext>();
            _destroy = handle.DangerousGetMethod<DestroyContext>();
            _createXonly = handle.DangerousGetMethod<KeypairXOnlyPub>();
            _serializeXonly = handle.DangerousGetMethod<XOnlyPubkeySerialize>();
            _signHash = handle.DangerousGetMethod<SignHash>();
            
            //Store random source
            _randomSource = randomSource;
        }

        /// <summary>
        /// Creates a new instance of the <see cref="LibSecp256k1"/> class from the specified library handle
        /// with a fallback random source
        /// </summary>
        /// <param name="handle">The library handle</param>
        /// <exception cref="ArgumentNullException"></exception>
        /// <exception cref="MissingMemberException"></exception>
        /// <exception cref="EntryPointNotFoundException"></exception>
        public LibSecp256k1(SafeLibraryHandle handle):this(handle, new FallbackRandom())
        {}

        /// <summary>
        /// Generates a new secret key and writes it to the specified buffer. The buffer size must be exactly <see cref="SecretKeySize"/> bytes long
        /// </summary>
        /// <param name="buffer">The secret key buffer</param>
        /// <exception cref="ArgumentException"></exception>
        public void CreateSecretKey(Span<byte> buffer)
        {
            //Protect for released lib
            SafeLibHandle.ThrowIfClosed();

            if(buffer.Length != SecretKeySize)
            {
                throw new ArgumentException($"Buffer must be exactly {SecretKeySize} bytes long", nameof(buffer));
            }

            //Fill the buffer with random bytes
            _randomSource.GetRandomBytes(buffer);
        }

        /// <summary>
        /// Fills the given buffer with random bytes from 
        /// the internal random source
        /// </summary>
        /// <param name="buffer">The buffer to fill with random data</param>
        public void GetRandomBytes(Span<byte> buffer)
        {
            //Protect for released lib
            SafeLibHandle.ThrowIfClosed();

            _randomSource.GetRandomBytes(buffer);
        }

        protected override void Free()
        {
            //Free native library
            SafeLibHandle.Dispose();
        }

        private record class FallbackRandom : IRandomSource
        {
            public void GetRandomBytes(Span<byte> buffer)
            {
                //Use the random generator from the crypto lib
                RandomHash.GetRandomBytes(buffer);
            }
        }
    }
}