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

        /// <summary>
        /// Decrypts a Nostr encrypted message by the target's public key, and the local secret key. 
        /// Both keys will be used to compute the shared secret that will be used to decrypt the message.
        /// </summary>
        /// <param name="secretKey">The local secret key</param>
        /// <param name="targetKey">The message's target public key for the shared secret</param>
        /// <param name="aseIv">The initialization vector used to encrypt the message</param>
        /// <param name="cyphterText">The cyphertext to decrypt</param>
        /// <param name="outputBuffer">The output buffer to write plaintext data to</param>
        /// <returns>The number of bytes written to the output, 0 or negative for an error</returns>
        ERRNO DecryptMessage(ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> targetKey, ReadOnlySpan<byte> aseIv, ReadOnlySpan<byte> cyphterText, Span<byte> outputBuffer);

        /// <summary>
        /// Encrypts a message with the specified secret key, target public key, and initialization vector.
        /// </summary>
        /// <param name="secretKey"></param>
        /// <param name="targetKey"></param>
        /// <param name="aesIv">The initalization vector used by the AES cipher to encrypt data</param>
        /// <param name="plainText">The plaintext data to encrypt</param>
        /// <param name="cipherText">The ciphertext output buffer</param>
        /// <returns>The number of bytes written to the output buffer, 0 or negative on error</returns>
        ERRNO EncryptMessage(ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> targetKey, ReadOnlySpan<byte> aesIv, ReadOnlySpan<byte> plainText, Span<byte> cipherText);

        /// <summary>
        /// Fill a buffer with secure randomness/entropy
        /// </summary>
        /// <param name="bytes">A span of memory to fill with random data</param>
        void GetRandomBytes(Span<byte> bytes);
    }

    readonly record struct KeyBufferSizes(int PrivateKeySize, int PublicKeySize);
}
