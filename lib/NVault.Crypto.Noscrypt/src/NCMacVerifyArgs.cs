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

using static NVault.Crypto.Noscrypt.LibNoscrypt;

namespace NVault.Crypto.Noscrypt
{
    internal unsafe struct NCMacVerifyArgs
    {
        /* The message authentication code certifying the Nip44 payload */
        public fixed byte mac[NC_ENCRYPTION_MAC_SIZE];

        /* The nonce used for the original message encryption */
        public fixed byte nonce[NC_ENCRYPTION_NONCE_SIZE];

        /* The message payload data */
        public byte* payload;

        /* The size of the payload data */
        public nint payloadSize;
    }
}
