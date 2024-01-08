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

using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

using VaultSharp;
using VaultSharp.V1.Commons;

using VNLib.Utils.Memory;
using VNLib.Plugins.Essentials.Extensions;


namespace NVault.VaultExtensions
{

    public static class VaultClientExtensions
    {
        
        private static string GetKeyPath(IVaultClientScope client, in VaultUserScope scope, string itemPath)
        {
            //Allow for null entry path
            return client.EntryPath == null ? $"{scope.UserId}/{itemPath}" : $"{client.EntryPath}/{scope.UserId}/{itemPath}";
        }


        public static Task<PrivateString?> GetSecretAsync(this IVaultClient client, IVaultKvClientScope scope, VaultUserScope user, string path)
        {
            return GetSecretAsync(client, scope, user, path, scope.StorageProperty);
        }

        public static async Task<PrivateString?> GetSecretAsync(this IVaultClient client, IVaultClientScope scope, VaultUserScope user, string path, string property)
        {
            //Get the path complete path for the scope
            string fullPath = GetKeyPath(scope, user, path);

            //Get the secret from the vault
            Secret<SecretData> result = await client.V1.Secrets.KeyValue.V2.ReadSecretAsync(fullPath, mountPoint:scope.MountPoint);

            //Try to get the secret value from the store
            string? value = result.Data.Data.GetValueOrDefault(property)?.ToString();

            //Return the secret value as a private string
            return value == null ? null : PrivateString.ToPrivateString(value, true);
        }

        /// <summary>
        /// Writes a secret to the vault that is scoped by the vault scope, and the user scope.
        /// </summary>
        /// <param name="client"></param>
        /// <param name="scope">The client scope configuration</param>
        /// <param name="user">The user scope to isolate the </param>
        /// <param name="path">The item path within the current scope</param>
        /// <param name="secret">The secret value to set at the desired property</param>
        /// <returns>A task that resolves when the secret has been updated</returns>
        public static async Task<CurrentSecretMetadata> SetSecretAsync(this IVaultClient client, IVaultKvClientScope scope, VaultUserScope user, string path, PrivateString secret)
        {
            Dictionary<string, string> secretDict = new()
            {
                //Dangerous cast, but we know the type
                { scope.StorageProperty, (string)secret }
            };

            //Await the result so we be sure the secret is not destroyed
            return await SetSecretAsync(client, scope, user, path, secretDict);
        }

        /// <summary>
        /// Writes a secret to the vault that is scoped by the vault scope, and the user scope.
        /// </summary>
        /// <param name="client"></param>
        /// <param name="scope">The client scope configuration</param>
        /// <param name="user">The user scope to isolate the </param>
        /// <param name="path">The item path within the current scope</param>
        /// <param name="secret">The secret value to set at the desired property</param>
        /// <returns>A task that resolves when the secret has been updated</returns>
        public static async Task<CurrentSecretMetadata> SetSecretAsync(this IVaultClient client, IVaultClientScope scope, VaultUserScope user, string path, IDictionary<string, string> secret)
        {
            //Get the path complete path for the scope
            string fullPath = GetKeyPath(scope, user, path);

            //Get the secret from the vault
            Secret<CurrentSecretMetadata> result = await client.V1.Secrets.KeyValue.V2.WriteSecretAsync(fullPath, secret, mountPoint:scope.MountPoint);

            return result.Data;
        }

        /// <summary>
        /// Deletes a secret from the vault that is scoped by the vault scope, and the user scope.
        /// </summary>
        /// <param name="client"></param>
        /// <param name="scope">The client scope</param>
        /// <param name="user">The vault user scope</param>
        /// <param name="path">The path to the storage</param>
        /// <returns>A task that resolves when the delete operation has completed</returns>
        public static Task DeleteSecretAsync(this IVaultClient client, IVaultClientScope scope, VaultUserScope user, string path)
        {
            string fullApth = GetKeyPath(scope, user, path);
            return client.V1.Secrets.KeyValue.V2.DeleteSecretAsync(fullApth, mountPoint:scope.MountPoint);
        }

        /// <summary>
        /// Deletes a secret from the vault
        /// </summary>
        /// <param name="user">The user scope of the secret</param>
        /// <param name="path">The path to the secret</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that returns when the operation has completed</returns>
        public static Task DeleteSecretAsync(this IKvVaultStore store, VaultUserScope user, string path, CancellationToken cancellation)
        {
            return store.DeleteSecretAsync(user, path).WaitAsync(cancellation);
        }


        /// <summary>
        /// Gets a secret from the vault at the specified path and user scope
        /// </summary>
        /// <param name="user">The user scope to get the value from</param>
        /// <param name="path">The secret path</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that resolves the secret if found, null otherwise</returns>
        public static Task<PrivateString?> GetSecretAsync(this IKvVaultStore store, VaultUserScope user, string path, CancellationToken cancellation)
        {
            return store.GetSecretAsync(user, path).WaitAsync(cancellation);
        }


        /// <summary>
        /// Sets a secret in the vault at the specified path and user scope
        /// </summary>
        /// <param name="user">The user scope to store the value at</param>
        /// <param name="path">The path to the secret</param>
        /// <param name="secret">The secret value to set</param>
        /// <param name="cancellation">The cancellation token</param>
        /// <returns>A task that resolves when the secret has been updated</returns>
        public static Task SetSecretAsync(this IKvVaultStore store, VaultUserScope user, string path, PrivateString secret, CancellationToken cancellation)
        {
            return store.SetSecretAsync(user, path, secret).WaitAsync(cancellation);
        }


    }
}