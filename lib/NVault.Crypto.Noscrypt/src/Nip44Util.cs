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
using System.Buffers.Binary;
using System.Runtime.InteropServices;

using VNLib.Utils.Memory;

namespace NVault.Crypto.Noscrypt
{
    /// <summary>
    /// Provides a set of utility methods for working with the Noscrypt library
    /// </summary>
    public static class Nip44Util
    {
        /// <summary>
        /// Calculates the required NIP44 encryption buffer size for 
        /// the specified input data size
        /// </summary>
        /// <param name="dataSize">The size (in bytes) of the encoded data to encrypt</param>
        /// <returns>The exact size of the padded buffer output</returns>
        public static uint CalcBufferSize(uint dataSize)
        {
            //always add leading 2 bytes for the encoded data size
            dataSize += sizeof(ushort);

            //Min message size is 32 bytes
            uint minSize = Math.Max(dataSize, 32);

            //calculate the next power of 2
            uint nextPow2 = 1;
            while (nextPow2 < minSize)
            {
                nextPow2 <<= 1;
            }

            return nextPow2;
        }

        /// <summary>
        /// Formats the plaintext data into a buffer that can be properly encrypted. 
        /// The output buffer must be zeroed, or can be zeroed using the 
        /// <paramref name="zeroOutput"/> parameter. Use <see cref="CalcBufferSize(uint)"/> 
        /// to determine the required output buffer size.
        /// </summary>
        /// <param name="plaintextData">A buffer containing plaintext data to copy to the output</param>
        /// <param name="output">The output data buffer to format</param>
        /// <param name="zeroOutput">A value that indicates if the buffer should be zeroed before use</param>
        public static void FormatBuffer(ReadOnlySpan<byte> plaintextData, Span<byte> output, bool zeroOutput)
        {
            //First zero out the buffer
            if (zeroOutput)
            {
                MemoryUtil.InitializeBlock(output);
            }

            //Make sure the output buffer is large enough so we dont overrun it
            ArgumentOutOfRangeException.ThrowIfLessThan(output.Length, plaintextData.Length + sizeof(ushort), nameof(output));

            //Write the data size to the first 2 bytes
            ushort dataSize = (ushort)plaintextData.Length;
            BinaryPrimitives.WriteUInt16BigEndian(output, dataSize);

            //Copy the plaintext data to the output buffer after the data size
            MemoryUtil.Memmove(
                ref MemoryMarshal.GetReference(plaintextData),
                sizeof(ushort),
                ref MemoryMarshal.GetReference(output),
                0, 
                (uint)plaintextData.Length
            );

            //We assume the remaining buffer is zeroed out
        }

        public static void Encrypt(
            this INostrCrypto lib, 
            ref readonly NCSecretKey secretKey, 
            ref readonly NCPublicKey publicKey, 
            ReadOnlySpan<byte> nonce32, 
            ReadOnlySpan<byte> plainText, 
            Span<byte> cipherText
        )
        {
            ArgumentNullException.ThrowIfNull(lib);
            
            //Chacha requires the output buffer to be at-least the size of the input buffer
            ArgumentOutOfRangeException.ThrowIfGreaterThan(plainText.Length, cipherText.Length, nameof(plainText));

            //Nonce must be exactly 32 bytes
            ArgumentOutOfRangeException.ThrowIfNotEqual(nonce32.Length, 32, nameof(nonce32));

            //Encrypt data, use the plaintext buffer size as the data size
            lib.Encrypt(
                in secretKey, 
                in publicKey,
                in MemoryMarshal.GetReference(nonce32),
                in MemoryMarshal.GetReference(plainText),
                ref MemoryMarshal.GetReference(cipherText), 
                (uint)plainText.Length
            );
        }

        public static unsafe void Encrypt(
            this INostrCrypto lib,
            ref NCSecretKey secretKey,
            ref NCPublicKey publicKey,
            void* nonce32,
            void* plainText,
            void* cipherText,
            uint size
        )
        {
            ArgumentNullException.ThrowIfNull(plainText);
            ArgumentNullException.ThrowIfNull(cipherText);
            ArgumentNullException.ThrowIfNull(nonce32);

            //Spans are easer to forward references from pointers without screwing up arguments
            Encrypt(
                lib,
                in secretKey,
                in publicKey,
                new Span<byte>(nonce32, 32),
                new Span<byte>(plainText, (int)size),
                new Span<byte>(cipherText, (int)size)
            );
        }
     

        public static void Decrypt(
            this INostrCrypto lib, 
            ref readonly NCSecretKey secretKey, 
            ref readonly NCPublicKey publicKey, 
            ReadOnlySpan<byte> nonce32, 
            ReadOnlySpan<byte> cipherText, 
            Span<byte> plainText
        )
        {
            ArgumentNullException.ThrowIfNull(lib);

            //Chacha requires the output buffer to be at-least the size of the input buffer
            ArgumentOutOfRangeException.ThrowIfGreaterThan(cipherText.Length, plainText.Length, nameof(cipherText));

            //Nonce must be exactly 32 bytes
            ArgumentOutOfRangeException.ThrowIfNotEqual(nonce32.Length, 32, nameof(nonce32));

            //Decrypt data, use the ciphertext buffer size as the data size
            lib.Decrypt(
                in secretKey, 
                in publicKey, 
                in MemoryMarshal.GetReference(nonce32), 
                in MemoryMarshal.GetReference(cipherText), 
                ref MemoryMarshal.GetReference(plainText), 
                (uint)cipherText.Length
            );
        }

        public static unsafe void Decrypt(
            this INostrCrypto lib, 
            ref readonly NCSecretKey secretKey, 
            ref readonly NCPublicKey publicKey, 
            void* nonce32, 
            void* cipherText, 
            void* plainText, 
            uint size
        )
        {
            ArgumentNullException.ThrowIfNull(nonce32);
            ArgumentNullException.ThrowIfNull(cipherText);
            ArgumentNullException.ThrowIfNull(plainText);            

            //Spans are easer to forward references from pointers without screwing up arguments
            Decrypt(
                lib,
                in secretKey,
                in publicKey,
                new Span<byte>(nonce32, 32),
                new Span<byte>(cipherText, (int)size),
                new Span<byte>(plainText, (int)size)
            );
        }
    }
}
