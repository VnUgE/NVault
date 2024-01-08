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
    internal sealed class NostrKeyMetaStore : DbStore<NostrKeyMeta>
    {
        private readonly DbContextOptions _options;

        public NostrKeyMetaStore(DbContextOptions options) => _options = options;

        ///<inheritdoc/>
        public override IDbQueryLookup<NostrKeyMeta> QueryTable { get; } = new DbQueries();

        ///<inheritdoc/>
        public override IDbContextHandle GetNewContext() => new NostrContext(_options);

        ///<inheritdoc/>
        public override string GetNewRecordId() => Guid.NewGuid().ToString("N");

        ///<inheritdoc/>
        public override void OnRecordUpdate(NostrKeyMeta newRecord, NostrKeyMeta currentRecord)
        {
            //Update username and key value
            currentRecord.UserName = newRecord.UserName;
            currentRecord.Value = newRecord.Value;

            currentRecord.UserId = newRecord.UserId;

            //Update last modified time
            newRecord.LastModified = DateTime.UtcNow;
        }

        sealed record class DbQueries : IDbQueryLookup<NostrKeyMeta>
        {
            ///<inheritdoc/>
            public IQueryable<NostrKeyMeta> GetCollectionQueryBuilder(IDbContextHandle context, params string[] constraints)
            {
                string userId = constraints[0];

                return from r in context.Set<NostrKeyMeta>()
                       where r.UserId == userId
                       select r;
            }

            ///<inheritdoc/>
            public IQueryable<NostrKeyMeta> GetSingleQueryBuilder(IDbContextHandle context, params string[] constraints)
            {
                string id = constraints[0];
                string userId = constraints[1];

                //Get relay for the given user by its id
                return from r in context.Set<NostrKeyMeta>()
                       where r.Id == id && r.UserId == userId
                       select r;
            }
        }
    }
}
