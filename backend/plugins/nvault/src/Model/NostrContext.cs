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

using Microsoft.EntityFrameworkCore;

using VNLib.Plugins.Extensions.Data;
using VNLib.Plugins.Extensions.Loading.Sql;

namespace NVault.Plugins.Vault.Model
{

    internal class NostrContext : DBContextBase, IDbTableDefinition
    {
        public DbSet<NostrRelay> NostrRelays { get; set; }

        public DbSet<NostrKeyMeta> NostrPublicKeys { get; set; }

        public DbSet<NostrEventEntry> NostrEvents { get; set; }

        public NostrContext()
        { }

        public NostrContext(DbContextOptions options) : base(options)
        { }

        public void OnDatabaseCreating(IDbContextBuilder builder, object? userState)
        {
            //Configure relay table
            builder.DefineTable<NostrRelay>(nameof(NostrRelays))
                .WithColumn(r => r.Id)
                    .MaxLength(50)
                    .Next()

                .WithColumn(r => r.UserId)
                    .Next()

                //Url is unique 
                .WithColumn(r => r.Url)
                    .Unique()
                    .AllowNull(false)
                    .Next()

                //Default flags is 0 (none)
                .WithColumn(r => (int)r.Flags)
                    .AllowNull(false)
                    .WithDefault(0)
                    .Next()

                .WithColumn(r => r.Created)
                    .AllowNull(false)
                    .Next()

                .WithColumn(r => r.LastModified)
                    .AllowNull(false)
                    .Next()

                //Finally, version, it should be set to the timestamp from annotations
                .WithColumn(r => r.Version);

            //Setup public key table
            builder.DefineTable<NostrKeyMeta>(nameof(NostrPublicKeys))
                .WithColumn(r => r.Id)
                    .Next()

                .WithColumn(r => r.UserId)
                    .Next()

                .WithColumn(r => r.UserName)
                    .AllowNull(true)
                    .Next()

                //Public key is unique 
                .WithColumn(r => r.Value)
                    .Unique()
                    .AllowNull(false)
                    .Next()

                .WithColumn(r => r.Created)
                    .AllowNull(false)
                    .Next()

                .WithColumn(r => r.LastModified)
                    .AllowNull(false)
                    .Next()

                //Finally, version, it should be set to the timestamp from annotations
                .WithColumn(r => r.Version);

            //Setup event table
            builder.DefineTable<NostrEventEntry>(nameof(NostrEvents))
                .WithColumn(r => r.Id)  //PK attribute is set from model base
                    .Next()

                .WithColumn(r => r.UserId)
                    .Next()

                .WithColumn(r => r.EventData)
                    .AllowNull(true)
                    .Next()

                .WithColumn(r => r.Created)
                    .AllowNull(false)
                    .Next()

                .WithColumn(r => r.LastModified)
                    .AllowNull(false)
                    .Next()

                //Finally, version, it should be set to the timestamp from annotations
                .WithColumn(r => r.Version);
        }
    }
}
