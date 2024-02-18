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

namespace NVault.Crypto.Noscrypt
{
    public interface INostrCrypto
    {
        void GetPublicKey(ref readonly NCSecretKey secretKey, ref NCPublicKey publicKey);

        bool ValidateSecretKey(ref readonly NCSecretKey secretKey);

        void SignData(ref readonly NCSecretKey secretKey, ref readonly byte random32, ref readonly byte data, nint dataSize, ref byte sig64);

        bool VerifyData(ref readonly NCPublicKey pubKey, ref readonly byte data, nint dataSize, ref byte sig64);

        bool VerifyMac(
            ref readonly NCSecretKey secretKey, 
            ref readonly NCPublicKey publicKey, 
            ref readonly byte nonce32,
            ref readonly byte mac32,
            ref readonly byte payload,
            nint payloadSize
        );

        void Encrypt(
            ref readonly NCSecretKey secretKey, 
            ref readonly NCPublicKey publicKey, 
            ref readonly byte nonce, 
            ref readonly byte plainText, 
            ref byte cipherText, 
            uint size,
            ref byte hmacKeyOut32
        );

        void Decrypt(
            ref readonly NCSecretKey secretKey, 
            ref readonly NCPublicKey publicKey, 
            ref readonly byte nonce, 
            ref readonly byte cipherText, 
            ref byte plainText, 
            uint size
        );
    }
}
