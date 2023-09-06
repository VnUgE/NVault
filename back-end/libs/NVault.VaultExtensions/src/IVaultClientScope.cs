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

namespace NVault.VaultExtensions
{
    /// <summary>
    /// Represents a vault client scope configuration
    /// </summary>
    public interface IVaultClientScope
    {
        /// <summary>
        /// The mount point for the vault
        /// </summary>
        string? MountPoint { get; }

        /// <summary>
        /// The entry path for the vault
        /// </summary>
        string? EntryPath { get; }
    }
}