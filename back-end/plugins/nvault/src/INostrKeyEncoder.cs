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

using VNLib.Utils;

namespace NVault.Plugins.Vault
{
    /// <summary>
    /// Converts secp256k1 private keys to and from strings to store in 
    /// in the vault storage
    /// </summary>
    internal interface INostrKeyEncoder
    {
        /// <summary>
        /// Gets the size of the buffer required to hold the key data to decode
        /// </summary>
        /// <param name="keyData">The encoded key buffer</param>
        /// <returns>The minum size of the buffer required to decode the key</returns>
        int GetKeyBufferSize(ReadOnlySpan<char> keyData);

        /// <summary>
        /// Decodes the specified key data into the specified buffer
        /// </summary>
        /// <param name="keyData">The key character buffer</param>
        /// <param name="buffer">The binary output buffer</param>
        /// <returns>The number of bytes encoded, 0 or less if the operation failed</returns>
        ERRNO DecodeKey(ReadOnlySpan<char> keyData, Span<byte> buffer);

        /// <summary>
        /// Encodes the specified key buffer into a string
        /// </summary>
        /// <param name="buffer">The key to encode</param>
        /// <returns>The encoded string if possible</returns>
        string? EncodeKey(ReadOnlySpan<byte> buffer);
    }
}
