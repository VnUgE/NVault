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

using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

using VaultSharp;
using VaultSharp.V1.AuthMethods.Token;

using NVault.VaultExtensions;

namespace NVault.Plugins.Vault
{
    [ConfigurationName("nostr_vault")]
    internal sealed class ManagedVaultClient : KvVaultStorage
    {
        protected override IVaultClient Client { get; }
        protected override IVaultKvClientScope Scope { get; }

        public ManagedVaultClient(PluginBase plugin, IConfigScope config)
        {
            Scope = new KvScope()
            {
                MountPoint = config["mount"].GetString(),
                EntryPath = config["entry"].GetString() ?? "nostr",
                //Keys are stored in the key property
                StorageProperty = "key"
            };

            //Create the client
            Client = CreateClient(config);
        }

        private static IVaultClient CreateClient(IConfigScope config)
        {
            TokenAuthMethodInfo am = new(config["token"].GetString());

            VaultClientSettings settings = new(config["url"].GetString(), am)
            { };

            return new VaultClient(settings);
        }

        ///<inheritdoc/>
        public override string TranslatePath(string path)
        {
            //Prefix with the keys file path
            return $"keys/{path}";
        }


        private sealed class KvScope : IVaultKvClientScope
        {
            public string StorageProperty { get; init; } = "";
            public string? MountPoint { get; init; }
            public string? EntryPath { get; init; }
        }
    }
}
