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
using VNLib.Plugins.Extensions.Loading;

namespace NVault.Plugins.Vault.Model
{
    internal class NostrEventHistoryStore(IAsyncLazy<DbContextOptions> Options) : DbStore<NostrEventEntry>
    {
        ///<inheritdoc/>
        public override IDbQueryLookup<NostrEventEntry> QueryTable { get; } = new DbQueries();

        ///<inheritdoc/>
        public override IDbContextHandle GetNewContext() => new NostrContext(Options.Value);

        ///<inheritdoc/>
        public override string GetNewRecordId() => Guid.NewGuid().ToString("N");

        public override void OnRecordUpdate(NostrEventEntry newRecord, NostrEventEntry existing)
        {
            existing.EventData = newRecord.EventData;
            existing.UserId = newRecord.UserId;
            newRecord.LastModified = DateTime.UtcNow;
        }

        sealed record class DbQueries() : IDbQueryLookup<NostrEventEntry>
        {
            public IQueryable<NostrEventEntry> GetCollectionQueryBuilder(IDbContextHandle context, params string[] constraints)
            {
                string userId = constraints[0];

                return from r in context.Set<NostrEventEntry>()
                       where r.UserId == userId
                       orderby r.LastModified descending
                       select r;
            }

            public IQueryable<NostrEventEntry> GetSingleQueryBuilder(IDbContextHandle context, params string[] constraints)
            {
                string id = constraints[0];
                string userId = constraints[1];

                //Get entity for the given user by its id
                return from r in context.Set<NostrEventEntry>()
                       where r.Id == id && r.UserId == userId
                       select r;
            }
        }
    }
}
