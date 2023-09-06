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

using System.Threading.Tasks;

using VNLib.Utils.Memory;

namespace NVault.VaultExtensions
{
    /// <summary>
    /// Represents a vault key-value store that can be used to store secrets
    /// </summary>
    public interface IKvVaultStore
    {
        /// <summary>
        /// Deletes a secret from the vault
        /// </summary>
        /// <param name="user">The user scope of the secret</param>
        /// <param name="path">The path to the secret</param>
        /// <returns>A task that returns when the operation has completed</returns>
        Task DeleteSecretAsync(VaultUserScope user, string path);

        /// <summary>
        /// Sets a secret in the vault at the specified path and user scope
        /// </summary>
        /// <param name="user">The user scope to store the value at</param>
        /// <param name="path">The path to the secret</param>
        /// <param name="secret">The secret value to set</param>
        /// <returns>A task that resolves when the secret has been updated</returns>
        Task SetSecretAsync(VaultUserScope user, string path, PrivateString secret);

        /// <summary>
        /// Gets a secret from the vault at the specified path and user scope
        /// </summary>
        /// <param name="user">The user scope to get the value from</param>
        /// <param name="path">The secret path</param>
        /// <returns>A task that resolves the secret if found, null otherwise</returns>
        Task<PrivateString?> GetSecretAsync(VaultUserScope user, string path);
    }
}