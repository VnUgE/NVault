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
using System.Linq;

using Microsoft.EntityFrameworkCore;

using VNLib.Plugins.Extensions.Data;
using VNLib.Plugins.Extensions.Data.Abstractions;

namespace NVault.Plugins.Vault.Model
{
    internal class NostrRelayStore : DbStore<NostrRelay>
    {
        private readonly DbContextOptions _options;

        public NostrRelayStore(DbContextOptions options)
        {
            _options = options;
        }

        ///<inheritdoc/>
        public override IDbQueryLookup<NostrRelay> QueryTable { get; } = new DbQueries();

        ///<inheritdoc/>
        public override IDbContextHandle GetNewContext() => new NostrContext(_options);

        ///<inheritdoc/>
        public override string GetNewRecordId() => Guid.NewGuid().ToString("N");


        public override void OnRecordUpdate(NostrRelay newRecord, NostrRelay currentRecord)
        {
            currentRecord.Flags = newRecord.Flags;
            currentRecord.Url = newRecord.Url;
            currentRecord.UserId = newRecord.UserId;

            //Update times
            newRecord.LastModified = DateTime.UtcNow;
        }

        sealed record class DbQueries() : IDbQueryLookup<NostrRelay>
        {
            public IQueryable<NostrRelay> GetCollectionQueryBuilder(IDbContextHandle context, params string[] constraints)
            {
                string userId = constraints[0];

                return from r in context.Set<NostrRelay>()
                       where r.UserId == userId
                       select r;
            }

            public IQueryable<NostrRelay> GetSingleQueryBuilder(IDbContextHandle context, params string[] constraints)
            {
                string id = constraints[0];
                string userId = constraints[1];

                //Get relay for the given user by its id
                return from r in context.Set<NostrRelay>()
                       where r.Id == id && r.UserId == userId
                       select r;
            }
        }
    }
}
