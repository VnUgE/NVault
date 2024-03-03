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
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;

using VNLib.Net.Http;
using VNLib.Utils.IO;
using VNLib.Utils.Extensions;
using VNLib.Plugins;
using VNLib.Plugins.Essentials;
using VNLib.Plugins.Essentials.Endpoints;
using VNLib.Plugins.Essentials.Extensions;
using VNLib.Plugins.Extensions.Loading;

namespace NVault.Plugins.Vault.Endpoints
{

    [ConfigurationName("discovery")]
    internal sealed class WellKnownEndpoint : ResourceEndpointBase, IDisposable
    {
        private readonly VnMemoryStream _discoveryJsonData;
        private readonly TimeSpan _cacheDuration;

        protected override ProtectionSettings EndpointProtectionSettings { get; } = new()
        {
            //We are going to enable caching ourselves and sessions are not required for discovery
            EnableCaching = true,
            DisableSessionsRequired = true,
        };

        public WellKnownEndpoint(PluginBase plugin, IConfigScope config)
        {
            string path = config.GetRequiredProperty("path", p => p.GetString()!);
            InitPathAndLog(path, plugin.Log);

            //Users may set the cache duration
            _cacheDuration = config.GetRequiredProperty("cache_duration_sec", p => p.GetTimeSpan(TimeParseType.Seconds));

            //We cant get the account's path programatically, so the user will have to configure it manually
            string accountsPath = config.GetRequiredProperty("accounts_path", p => p.GetString()!);

            IConfigScope vaultEp = plugin.GetConfigForType<Endpoint>();
            string nvaultPath = vaultEp.GetRequiredProperty("path", p => p.GetString()!);

            IConfigScope syncConfig = plugin.GetConfigForType<SettingSyncEndpoint>();
            string syncPath = syncConfig.GetRequiredProperty("path", p => p.GetString()!);

            //Build the discovery result to serialize to json
            NvaultDiscoveryResult res = new()
            {
                //Map endpoints
                Endpoints = [
                    GetEndpoint("accounts", accountsPath),
                    GetEndpoint("nostr", nvaultPath),
                    GetEndpoint("sync", syncPath)
                ]
            };

            _discoveryJsonData = new VnMemoryStream();
            JsonSerializer.Serialize(_discoveryJsonData, res);
            _discoveryJsonData.Seek(0, System.IO.SeekOrigin.Begin);

            //Set as readonly to make zero alloc copies
            VnMemoryStream.CreateReadonly(_discoveryJsonData);
        }

        protected override VfReturnType Get(HttpEntity entity)
        {
            //Allow caching
            entity.Server.SetCache(CacheType.Public, _cacheDuration);

            //Return a copy of the discovery json object
            return VirtualClose(
                entity, 
                HttpStatusCode.OK, 
                ContentType.Json, 
                _discoveryJsonData.GetReadonlyShallowCopy()  //Shallow copy to avoid alloc and copy
            );
        }

        void IDisposable.Dispose()
        {
            _discoveryJsonData.Dispose();
        }

        private static NvaultEndpoint GetEndpoint(string name, string path)
        {
            return new()
            {
                Name = name,
                Path = path
            };
        }

        sealed class NvaultDiscoveryResult
        {
            [JsonPropertyName("endpoints")]
            public NvaultEndpoint[]? Endpoints { get; set; }
        }

        sealed class NvaultEndpoint
        {
            [JsonPropertyName("name")]
            public string? Name { get; set; }

            [JsonPropertyName("path")]
            public string? Path { get; set; }
        }

        public void Dispose()
        {
            throw new NotImplementedException();
        }
    }
}
