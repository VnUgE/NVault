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
    internal interface INostrCryptoProvider
    {
        /// <summary>
        /// Gets the size of the buffer required to hold a signature data
        /// </summary>
        /// <returns>The size of the required buffer</returns>
        int GetSignatureBufferSize();

        /// <summary>
        /// Signs a message digest with the specified private key and writes 
        /// the signature to the specified buffer.
        /// </summary>
        /// <param name="key"></param>
        /// <param name="digest"></param>
        /// <param name="signatureBuffer"></param>
        /// <returns>The number of bytes written to the signature buffer, 0 or less if the operation failed</returns>
        ERRNO SignMessage(ReadOnlySpan<byte> key, ReadOnlySpan<byte> digest, Span<byte> signatureBuffer);

        /// <summary>
        /// Determines the exact size of the buffer required to hold a key pair during 
        /// creation
        /// </summary>
        /// <returns>The structure containing the exact sizes of the buffers to allocate</returns>
        KeyBufferSizes GetKeyBufferSize();

        /// <summary>
        /// Generates a new key pair and writes the key outputs to the specified buffers.
        /// The buffers will be at-leat the size of the values returned by <see cref="GetKeyBufferSize"/>
        /// </summary>
        /// <param name="publicKey">A buffer to write the public key to</param>
        /// <param name="privateKey">A buffer to write the private key to</param>
        /// <returns>True if the operation succeeded</returns>
        bool TryGenerateKeyPair(Span<byte> publicKey, Span<byte> privateKey);

        /// <summary>
        /// Recovers the public key from the specified private key and writes it to the specified buffer
        /// </summary>
        /// <param name="privateKey">The readonly private key</param>
        /// <param name="pubKey">The recovered public key</param>
        /// <returns>True if the operation succeeded, false otherwise</returns>
        bool RecoverPublicKey(ReadOnlySpan<byte> privateKey, Span<byte> pubKey);
    }

    readonly record struct KeyBufferSizes(int PrivateKeySize, int PublicKeySize);
}
