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

//Export all shared types
export type { NostrPubKey, LoginMessage } from './types'
export type * from './framework'
export type { PluginConfig } from './settings'
export type { PkiPubKey, EcKeyParams, LocalPkiApi as PkiApi } from './pki-api'
export type { NostrApi } from './nostr-api'
export type { UserApi } from './auth-api'
export type { IdentityApi } from './identity-api'

export { useBackgroundFeatures, useForegoundFeatures } from './framework'
export { useLocalPki, usePkiApi } from './pki-api'
export { useAuthApi } from './auth-api'
export { useIdentityApi } from './identity-api'
export { useNostrApi } from './nostr-api'
export { useSettingsApi, useAppSettings } from './settings'
export { useHistoryApi } from './history'
export { useEventTagFilterApi } from './tagfilter-api'
export { useInjectAllowList } from './nip07allow-api'
export { onWatchableChange } from './util'
export { useMfaConfigApi, type MfaUpdateResult } from './mfa-api'