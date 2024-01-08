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
using System.Buffers.Text;

using VNLib.Utils;

namespace NVault.Plugins.Vault
{
    class Base64KeyEncoder : INostrKeyEncoder
    {
        public int GetKeyBufferSize(ReadOnlySpan<char> keyData) => Base64.GetMaxEncodedToUtf8Length(keyData.Length);

        public ERRNO DecodeKey(ReadOnlySpan<char> keyData, Span<byte> buffer) => VnEncoding.TryFromBase64Chars(keyData, buffer);

        public string? EncodeKey(ReadOnlySpan<byte> buffer) => Convert.ToBase64String(buffer);
    }
}
