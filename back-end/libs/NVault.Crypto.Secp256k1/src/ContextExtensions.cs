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

using VNLib.Hashing;
using VNLib.Utils;
using VNLib.Utils.Memory;
using VNLib.Utils.Extensions;

using static NVault.Crypto.Secp256k1.LibSecp256k1;

namespace NVault.Crypto.Secp256k1
{
    public delegate int Secp256k1EcdhHashFunc(in Secp256HashFuncState state);

    [StructLayout(LayoutKind.Sequential)]
    public unsafe readonly ref struct Secp256HashFuncState
    {

        /// <summary>
        /// The opaque pointer passed to the hash function
        /// </summary>
        public readonly IntPtr Opaque { get; }

        private readonly byte* _output;
        private readonly byte* _xCoord;
        private readonly int _outputLength;
        private readonly int _xCoordLength;

        internal Secp256HashFuncState(byte* output, int outputLength, byte* xCoord, int xCoordLength, IntPtr opaque)
        {
            Opaque = opaque;
            _output = output;
            _outputLength = outputLength;
            _xCoord = xCoord;
            _xCoordLength = xCoordLength;
        }

        /// <summary>
        /// Gets the output buffer as a span
        /// </summary>
        /// <returns>The output buffer span</returns>
        public readonly Span<byte> GetOutput() => new(_output, _outputLength);

        /// <summary>
        /// Gets the x coordinate argument as a span
        /// </summary>
        /// <returns>The xcoordinate buffer span</returns>
        public readonly ReadOnlySpan<byte> GetXCoordArg() => new(_xCoord, _xCoordLength);
    }

    public static unsafe class ContextExtensions
    {
        /// <summary>
        /// Creates a new <see cref="Secp256k1Context"/> from the current managed library
        /// </summary>
        /// <param name="Lib"></param>
        /// <returns>The new <see cref="Secp256k1Context"/> object from the library</returns>
        /// <exception cref="CryptographicException"></exception>
        public static Secp256k1Context CreateContext(this LibSecp256k1 Lib)
        {
            //Protect for released lib
            Lib.SafeLibHandle.ThrowIfClosed();

            //Create new context
            IntPtr context = Lib._create(1);

            if (context == IntPtr.Zero)
            {
                throw new CryptographicException("Failed to create the new Secp256k1 context");
            }

            return new Secp256k1Context(Lib, context);
        }

        /// <summary>
        /// Signs a 32byte message digest with the specified secret key on the current context and writes the signature to the specified buffer
        /// </summary>
        /// <param name="context"></param>
        /// <param name="secretKey">The 32byte secret key used to sign messages from the user</param>
        /// <param name="digest">The 32byte message digest to compute the signature of</param>
        /// <param name="signature">The buffer to write the signature output to, must be at-least 64 bytes</param>
        /// <returns>The number of bytes written to the signature buffer, or less than 1 if the operation failed</returns>
        public static ERRNO SchnorSignDigest(this in Secp256k1Context context, ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> digest, Span<byte> signature)
        {
            //Check the signature buffer size
            if (signature.Length < SignatureSize)
            {
                return ERRNO.E_FAIL;
            }

            //Message digest must be exactly 32 bytes long
            if (digest.Length != (int)HashAlg.SHA256)
            {
                return ERRNO.E_FAIL;
            }           

            //Stack allocated keypair
            KeyPair keyPair = new();

            //Randomize the context and create the keypair
            if (!context.CreateKeyPair(&keyPair, secretKey))
            {
                return ERRNO.E_FAIL;
            }

            //Create the random nonce
            byte* random = stackalloc byte[RandomBufferSize];

            //Fill the buffer with random bytes
            context.Lib.GetRandomBytes(new Span<byte>(random, RandomBufferSize));

            try
            {
                fixed (byte* sigPtr = &MemoryMarshal.GetReference(signature), 
                            digestPtr = &MemoryMarshal.GetReference(digest))
                {
                    //Sign the message hash and write the output to the signature buffer
                    if (context.Lib._signHash(context.Context, sigPtr, digestPtr, &keyPair, random) != 1)
                    {
                        return ERRNO.E_FAIL;
                    }
                }
            }
            finally
            {
                //Erase entropy
                MemoryUtil.InitializeBlock(random, RandomBufferSize);

                //Clear the keypair, contains the secret key, even if its stack allocated
                MemoryUtil.ZeroStruct(&keyPair);
            }

            //Signature size is always 64 bytes
            return SignatureSize;
        }

        /// <summary>
        /// Generates an x-only Schnor encoded public key from the specified secret key on the 
        /// current context and writes it to the specified buffer.
        /// </summary>
        /// <param name="context"></param>
        /// <param name="secretKey">The 32byte secret key used to derrive the public key from</param>
        /// <param name="pubKeyBuffer">The buffer to write the x-only Schnor encoded public key</param>
        /// <returns>The number of bytes written to the output buffer, or 0 if the operation failed</returns>
        /// <exception cref="CryptographicException"></exception>
        public static ERRNO GeneratePubKeyFromSecret(this in Secp256k1Context context, ReadOnlySpan<byte> secretKey, Span<byte> pubKeyBuffer)
        {
            if (secretKey.Length != SecretKeySize)
            {
                throw new CryptographicException($"Your secret key must be exactly {SecretKeySize} bytes long");
            }

            if (pubKeyBuffer.Length < XOnlyPublicKeySize)
            {
                throw new CryptographicException($"Your public key buffer must be at least {XOnlyPublicKeySize} bytes long");
            }

            //Protect for released lib
            context.Lib.SafeLibHandle.ThrowIfClosed();

            //Stack allocated keypair and x-only public key
            Secp256k1PublicKey xOnlyPubKey = new();
            KeyPair keyPair = new();

            try
            {
                //Init context and keypair
                if (!context.CreateKeyPair(&keyPair, secretKey))
                {
                    return ERRNO.E_FAIL;
                }

                //X-only public key from the keypair
                if (context.Lib._createXonly(context.Context, &xOnlyPubKey, 0, &keyPair) != 1)
                {
                    return ERRNO.E_FAIL;
                }

                fixed (byte* pubBuffer = &MemoryMarshal.GetReference(pubKeyBuffer))
                {
                    //Serialize the public key to the buffer as an X-only public key without leading status byte
                    if (context.Lib._serializeXonly(context.Context, pubBuffer, &xOnlyPubKey) != 1)
                    {
                        return ERRNO.E_FAIL;
                    }
                }
            }
            finally
            {
                //Clear the keypair, contains the secret key, even if its stack allocated
                MemoryUtil.ZeroStruct(&keyPair);
            }

            //PubKey length is constant
            return XOnlyPublicKeySize;
        }

        /// <summary>
        /// Verifies that a given secret key is valid using the current context
        /// </summary>
        /// <param name="context"></param>
        /// <param name="secretKey">The secret key to verify</param>
        /// <returns>A boolean value that indicates if the secret key is valid or not</returns>
        /// <exception cref="CryptographicException"></exception>
        public static bool VerifySecretKey(this in Secp256k1Context context, ReadOnlySpan<byte> secretKey)
        {
            if (secretKey.Length != SecretKeySize)
            {
                throw new CryptographicException($"Your secret key must be exactly {SecretKeySize} bytes long");
            }

            context.Lib.SafeLibHandle.ThrowIfClosed();

            //Get sec key ref and verify
            fixed(byte* ptr = &MemoryMarshal.GetReference(secretKey))
            {
                return context.Lib._secKeyVerify.Invoke(context.Context, ptr) == 1;
            }
        }


        [StructLayout(LayoutKind.Sequential)]
        private readonly ref struct EcdhHashFuncState
        {
            public readonly IntPtr HashFunc { get; init; }
            public readonly IntPtr Opaque { get; init; }
            public readonly int OutLen { get; init; }
        }

        /// <summary>
        /// Verifies that a given secret key is valid using the current context
        /// </summary>
        /// <param name="context"></param>
        /// <param name="secretKey">The secret key to verify</param>
        /// <returns>A boolean value that indicates if the secret key is valid or not</returns>
        /// <exception cref="ArgumentException"></exception>
        public static bool ComputeSharedKey(this in Secp256k1Context context, Span<byte> data, ReadOnlySpan<byte> xOnlyPubKey, ReadOnlySpan<byte> secretKey, Secp256k1EcdhHashFunc callback, IntPtr opaque)
        {
            if (secretKey.Length != SecretKeySize)
            {
                throw new ArgumentException($"Your secret key buffer must be exactly {SecretKeySize} bytes long");
            }

            //Init callback state struct
            EcdhHashFuncState state = new()
            {
                HashFunc = Marshal.GetFunctionPointerForDelegate(callback),
                Opaque = opaque,
                OutLen = data.Length
            };

            context.Lib.SafeLibHandle.ThrowIfClosed();

            //Stack allocated keypair and x-only public key
            Secp256k1PublicKey peerPubKey = new();

            //Parse the public key from the buffer
            fixed (byte* pubkeyPtr = &MemoryMarshal.GetReference(xOnlyPubKey))
            {
                context.Lib._xOnlyPubkeyParse(context.Context, &peerPubKey, pubkeyPtr);
            }

            fixed (byte* dataPtr = &MemoryMarshal.GetReference(data),
                    secKeyPtr = &MemoryMarshal.GetReference(secretKey))
            {
                return context.Lib._ecdh.Invoke(
                    context.Context, 
                    dataPtr, 
                    &peerPubKey, 
                    secKeyPtr, 
                    UmanagedEcdhHashFuncCallback, 
                    &state
                    ) == 1;
            }

            /*
             * Umanaged wrapper function for invoking the safe user callback 
             * from the unmanaged lib
             */
            static int UmanagedEcdhHashFuncCallback(byte* output, byte* x32, byte* y32, void* opaque)
            {
                //Recover the callback
                if (opaque == null)
                {
                    return 0;
                }

                EcdhHashFuncState* state = (EcdhHashFuncState*)opaque;

                //Init user-state structure
                Secp256HashFuncState userState = new(output, state->OutLen, x32, 32, new(opaque));

                //Recover the function pointer
                Secp256k1EcdhHashFunc callback = Marshal.GetDelegateForFunctionPointer<Secp256k1EcdhHashFunc>(state->HashFunc);

                //Invoke the callback 
                return callback(in userState);
            }
        }
    }
}