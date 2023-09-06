﻿// Copyright (C) 2023 Vaughn Nugent
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

using VNLib.Utils;
using VNLib.Utils.Native;
using VNLib.Utils.Extensions;

namespace NVault.Crypto.Secp256k1
{

    /// <summary>
    /// A wrapper class for an unmanaged random source that conforms to the <see cref="IRandomSource"/> interface
    /// </summary>
    public class UnmanagedRandomSource : VnDisposeable, IRandomSource
    {
        public const string METHOD_NAME = "getRandomBytes";

        unsafe delegate void UnmanagedRandomSourceDelegate(byte* buffer, int size);


        private readonly bool OwnsHandle;
        private readonly SafeLibraryHandle _library;
        private readonly UnmanagedRandomSourceDelegate _getRandomBytes;

        /// <summary>
        /// Loads the unmanaged random source from the given library 
        /// and attempts to get the random bytes method <see cref="METHOD_NAME"/>
        /// </summary>
        /// <param name="path"></param>
        /// <param name="search"></param>
        /// <returns>The wrapped library that conforms to the <see cref="IRandomSource"/></returns>
        public static UnmanagedRandomSource LoadLibrary(string path, DllImportSearchPath search)
        {
            //Try to load the library
            SafeLibraryHandle lib = SafeLibraryHandle.LoadLibrary(path, search);
            try
            {
                return new UnmanagedRandomSource(lib, true);
            }
            catch
            {
                //release lib
                lib.Dispose();
                throw;
            }
        }

        /// <summary>
        /// Creates the unmanaged random source from the given library
        /// </summary>
        /// <param name="lib">The library handle to wrap</param>
        /// <exception cref="ObjectDisposedException"></exception>
        /// <exception cref="EntryPointNotFoundException"></exception>
        public UnmanagedRandomSource(SafeLibraryHandle lib, bool ownsHandle)
        {
            lib.ThrowIfClosed();

            _library = lib;

            //get the method delegate
            _getRandomBytes = lib.DangerousGetMethod<UnmanagedRandomSourceDelegate>(METHOD_NAME);
            
            OwnsHandle = ownsHandle;
        }

        public unsafe void GetRandomBytes(Span<byte> buffer)
        {
            _library.ThrowIfClosed();

            //Fix buffer and call unmanaged method
            fixed(byte* ptr = buffer)
            {
                _getRandomBytes(ptr, buffer.Length);
            }
        }

        ///<inheritdoc/>
        protected override void Free()
        {
            if (OwnsHandle)
            {
                _library.Dispose();
            }
        }
    }
}