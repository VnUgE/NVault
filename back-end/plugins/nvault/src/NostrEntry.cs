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

using VNLib.Utils.Logging;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading.Routing;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Loading.Sql;

using NVault.Plugins.Vault.Model;
using NVault.Plugins.Vault.Endpoints;

namespace NVault.Plugins.Vault
{
    public sealed class NostrEntry : PluginBase
    {
        public override string PluginName { get; } = "NVault";

        protected override void OnLoad()
        {
            //Load the endpoint
            this.Route<Endpoint>();

            //Create the database
            _ = this.ObserveWork(() => this.EnsureDbCreatedAsync<NostrContext>(this), 1800);

            Log.Information("Plugin loaded");
        }

        protected override void OnUnLoad()
        {
            Log.Information("Plugin unloaded");
            
        }

        protected override void ProcessHostCommand(string cmd)
        {
            throw new NotImplementedException();
        }
    }
}