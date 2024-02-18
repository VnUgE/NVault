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

using static NVault.Crypto.Noscrypt.LibNoscrypt;

namespace NVault.Crypto.Noscrypt
{
    public static class NCExtensions
    {
        public static void SignData(
            this NostrCrypto lib, 
            ref readonly NCSecretKey secKey, 
            ReadOnlySpan<byte> random32, 
            ReadOnlySpan<byte> data, 
            Span<byte> signatureBuffer
        )
        {
            ArgumentOutOfRangeException.ThrowIfLessThan(signatureBuffer.Length, NC_SIGNATURE_SIZE, nameof(signatureBuffer));
            ArgumentOutOfRangeException.ThrowIfLessThan(random32.Length, 32, nameof(random32));
            ArgumentOutOfRangeException.ThrowIfZero(data.Length, nameof(data));

            lib.SignData(
                in secKey,
                in MemoryMarshal.GetReference(random32),
                in MemoryMarshal.GetReference(data),
                data.Length,
                ref MemoryMarshal.GetReference(signatureBuffer)
            );
        }
    }
}
