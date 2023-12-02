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

using VNLib.Utils.Extensions;
using VNLib.Utils.Memory;

using static NVault.Crypto.Secp256k1.LibSecp256k1;

namespace NVault.Crypto.Secp256k1
{
    /// <summary>
    /// Represents a Secp256k1 context, it is used to randomize the instance, create key pairs,
    /// and frees the context when disposed
    /// </summary>
    /// <param name="Lib">The <see cref="LibSecp256k1"/> library instance</param>
    /// <param name="Context">A pointer to the initialized context instance</param>
    public readonly record struct Secp256k1Context(LibSecp256k1 Lib, IntPtr Context) : IDisposable
    {
        /// <summary>
        /// Randomizes the context with random data using the library's random source
        /// </summary>
        /// <returns>True if the context was successfully randomized, false otherwise</returns>
        public unsafe readonly bool Randomize()
        {
            Lib.SafeLibHandle.ThrowIfClosed();

            //Randomze the context
            byte* entropy = stackalloc byte[RandomBufferSize];

            //Get random bytes
            Lib.GetRandomBytes(new Span<byte>(entropy, RandomBufferSize));
            
            //call native randomize method
            bool result = Lib._randomize(Context, entropy) == 1;
            
            //Zero the randomness buffer before returning to avoid leaking random data
            MemoryUtil.InitializeBlock(entropy, RandomBufferSize);
            
            return result;
        }

        internal unsafe readonly bool CreateKeyPair(KeyPair* keyPair, Secp256k1SecretKey* secretKey)
        {
            Lib.SafeLibHandle.ThrowIfClosed();

            //Create the keypair from the secret key
            return Lib._createKeyPair(Context, keyPair, (byte*)secretKey) == 1;
        }

        /// <summary>
        /// Releases the context instance and frees the memory
        /// </summary>
        public readonly void Dispose()
        {
            if (Context != IntPtr.Zero)
            {
                //Free the context
                Lib._destroy(Context);
            }
        }
    }
}