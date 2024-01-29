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
using System.Text.Json;
using System.Text.Json.Serialization;

using VNLib.Plugins.Extensions.Data;
using VNLib.Plugins.Extensions.Data.Abstractions;


namespace NVault.Plugins.Vault.Model
{
    internal sealed class NostrEventEntry : DbModelBase, IUserEntity
    {
        public override string Id { get; set; }
        
        public override DateTime Created { get; set; }
        
        public override DateTime LastModified { get; set; }

        //Never share userids with the client
        [JsonIgnore]
        public string? UserId { get; set; }

        public string? EventData { get; set; }

        public static NostrEventEntry FromEvent(string userId, NostrEvent @event) => new()
        {
            EventData= JsonSerializer.Serialize(@event),
            UserId = userId,
        };
       
    }
}