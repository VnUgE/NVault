// Copyright (C) 2025 Vaughn Nugent
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

using NVault.Plugins.Vault.Model;

using NVault.VaultExtensions;

namespace NVault.Plugins.Vault
{

    public readonly record struct NoteCipherArgs(NostrCipherVersion Version, bool IsEncrypting)
    {
        public required readonly string TargetPubKey { get; init; }

        public required readonly string InputText { get; init; }
    }

    internal interface INostrOperations
    {
        Task<bool> SignEventAsync(
            VaultUserScope scope, 
            NostrKeyMeta keyMeta, 
            NostrEvent evnt, 
            CancellationToken cancellation
        );

        Task<bool> CreateCredentialAsync(
            VaultUserScope scope, 
            NostrKeyMeta newKey, 
            CancellationToken cancellation
        );

        Task<bool> CreateFromExistingAsync(
            VaultUserScope scope, 
            NostrKeyMeta newKey, 
            string hexKey, 
            CancellationToken cancellation
        );

        Task DeleteCredentialAsync(
            VaultUserScope scope, 
            NostrKeyMeta key, 
            CancellationToken cancellation
        );

        Task<string?> UpdateCipherAsync(
            VaultUserScope scope, 
            NostrKeyMeta meta,
            NoteCipherArgs args,
            CancellationToken cancellation
        );
    }
}
