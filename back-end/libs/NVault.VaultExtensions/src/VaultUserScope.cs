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

namespace NVault.VaultExtensions
{
    /// <summary>
    /// Represents a user scope for the vault. It isolates the user's
    /// secrets from other users.
    /// </summary>
    /// <param name="UserId">The id of the user to scope the vault to</param>
    public readonly record struct VaultUserScope(string UserId)
    { }
}