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

using VaultSharp;

using VNLib.Utils.Memory;

namespace NVault.VaultExtensions
{
    /// <summary>
    /// An abstract kv storage implementation that uses the vault client to store secrets
    /// </summary>
    public abstract class KvVaultStorage : IKvVaultStore
    {
        /// <summary>
        /// The vault client
        /// </summary>
        protected abstract IVaultClient Client { get; }

        /// <summary>
        /// The storage scope
        /// </summary>
        protected abstract IVaultKvClientScope Scope { get; }

        public virtual Task DeleteSecretAsync(VaultUserScope user, string path)
        {
            string tPath = TranslatePath(path);
            return Client.DeleteSecretAsync(Scope, user, tPath);
        }

        public virtual Task SetSecretAsync(VaultUserScope user, string path, PrivateString secret)
        {
            string tPath = TranslatePath(path);
            return Client.SetSecretAsync(Scope, user, tPath, secret);
        }

        public virtual Task<PrivateString?> GetSecretAsync(VaultUserScope user, string path)
        {
            string tPath = TranslatePath(path);
            return Client.GetSecretAsync(Scope, user, tPath);
        }

        /// <summary>
        /// Translates a realtive item path to a full path 
        /// within the scope of the storage. This may be used to 
        /// extend the scope of the operation
        /// </summary>
        /// <param name="path">The item path to scope</param>
        /// <returns>The further scoped vault path for the item</returns>
        public virtual string TranslatePath(string path) => path;
    }
}