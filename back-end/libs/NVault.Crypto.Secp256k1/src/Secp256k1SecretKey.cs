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
using System.Runtime.InteropServices;

using VNLib.Utils.Memory;

namespace NVault.Crypto.Secp256k1
{
    /// <summary>
    /// Represents a Secp256k1 secret key, the size is fixed, and should use 
    /// the sizeof() operator to get the size
    /// </summary>
    [StructLayout(LayoutKind.Sequential, Size = 32)]
    public unsafe struct Secp256k1SecretKey
    {
        private fixed byte data[32];

        /// <summary>
        /// Implict cast to a span of raw bytes
        /// </summary>
        /// <param name="key">The secret key to cast</param>
        public static implicit operator Span<byte>(Secp256k1SecretKey key) => new(key.data, 32);

        /// <summary>
        /// Casts the secret key span to a <see cref="Secp256k1SecretKey"/> via a structure copy
        /// </summary>
        /// <param name="key">The key data to copy</param>
        /// <exception cref="ArgumentOutOfRangeException"></exception>
        public static explicit operator Secp256k1SecretKey(ReadOnlySpan<byte> key) => FromSpan(key);

        /// <summary>
        /// Creates a new <see cref="Secp256k1SecretKey"/> from a span of bytes
        /// by copying the bytes into the struct
        /// </summary>
        /// <param name="span">The secret key data to copy</param>
        /// <returns>An initilaized <see cref="Secp256k1SecretKey"/></returns>
        public static Secp256k1SecretKey FromSpan(ReadOnlySpan<byte> span) 
        {
            Secp256k1SecretKey newKey = new();
            MemoryUtil.CopyStruct(span, ref newKey);
            return newKey;
        }
    }
}