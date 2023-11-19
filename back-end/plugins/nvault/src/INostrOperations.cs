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

using System.Threading;
using System.Threading.Tasks;

using NVault.Plugins.Vault.Model;

using NVault.VaultExtensions;

namespace NVault.Plugins.Vault
{

    internal interface INostrOperations
    {
        Task<bool> SignEventAsync(VaultUserScope scope, NostrKeyMeta keyMeta, NostrEvent evnt, CancellationToken cancellation);

        Task<bool> CreateCredentialAsync(VaultUserScope scope, NostrKeyMeta newKey, CancellationToken cancellation);

        Task<bool> CreateFromExistingAsync(VaultUserScope scope, NostrKeyMeta newKey, string hexKey, CancellationToken cancellation);

        Task DeleteCredentialAsync(VaultUserScope scope, NostrKeyMeta key, CancellationToken cancellation);

        Task<string?> DecryptNoteAsync(VaultUserScope scope, NostrKeyMeta key, string targetPubKeyHex, string nip04Ciphertext, CancellationToken cancellation);

        Task<EncryptionResult> EncryptNoteAsync(VaultUserScope scope, NostrKeyMeta meta, string targetPubKey, string plainText, CancellationToken cancellation);
    }
}
