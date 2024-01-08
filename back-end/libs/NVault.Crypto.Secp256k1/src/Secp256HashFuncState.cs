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

namespace NVault.Crypto.Secp256k1
{
    [StructLayout(LayoutKind.Sequential)]
    public unsafe readonly ref struct Secp256HashFuncState
    {

        /// <summary>
        /// The opaque pointer passed to the hash function
        /// </summary>
        public readonly IntPtr Opaque { get; }

        private readonly byte* _output;
        private readonly byte* _xCoord;
        private readonly int _outputLength;
        private readonly int _xCoordLength;

        internal Secp256HashFuncState(byte* output, int outputLength, byte* xCoord, int xCoordLength, IntPtr opaque)
        {
            Opaque = opaque;
            _output = output;
            _outputLength = outputLength;
            _xCoord = xCoord;
            _xCoordLength = xCoordLength;
        }

        /// <summary>
        /// Gets the output buffer as a span
        /// </summary>
        /// <returns>The output buffer span</returns>
        public readonly Span<byte> GetOutput() => new(_output, _outputLength);

        /// <summary>
        /// Gets the x coordinate argument as a span
        /// </summary>
        /// <returns>The xcoordinate buffer span</returns>
        public readonly ReadOnlySpan<byte> GetXCoordArg() => new(_xCoord, _xCoordLength);
    }
}