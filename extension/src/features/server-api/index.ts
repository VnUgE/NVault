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


import { computed } from "vue"
import { get } from '@vueuse/core'
import { type WebMessage, type UserProfile } from "@vnuge/vnlib.browser"
import { initEndponts } from "./endpoints"
import { type NostrIdentiy } from "../foreground/types"
import { cloneDeep } from "lodash"
import { type AppSettings } from "../settings"
import type { NostrEvent, NostrRelay } from "../types"

export enum Endpoints {
    GetKeys = 'getKeys',
    DeleteKey = 'deleteKey',
    SignEvent = 'signEvent',
    GetRelays = 'getRelays',
    SetRelay = 'setRelay',
    Encrypt = 'encrypt',
    Decrypt = 'decrypt',
    CreateId = 'createIdentity',
    UpdateId = 'updateIdentity',
    UpdateProfile = 'updateProfile',
}

export const useServerApi = (settings: AppSettings) => {
    const { registerEndpoint, execRequest } = initEndponts()

    //ref to nostr endpoint url
    const nostrUrl = computed(() => settings.currentConfig.value.nostrEndpoint || '/nostr');
    const accUrl = computed(() => settings.currentConfig.value.accountBasePath || '/account');

    registerEndpoint({
        id: Endpoints.GetKeys,
        method: 'GET',
        path: () => `${get(nostrUrl)}?type=getKeys`,
        onRequest: () => Promise.resolve(),
        onResponse: (response) => Promise.resolve(response)
    })

    registerEndpoint({
        id: Endpoints.DeleteKey,
        method: 'DELETE',
        path: (key:NostrIdentiy) => `${get(nostrUrl)}?type=identity&key_id=${key.Id}`,
        onRequest: () => Promise.resolve(),
        onResponse: async (response: WebMessage) => response.getResultOrThrow()
    })

    registerEndpoint({
        id: Endpoints.SignEvent,
        method: 'POST',
        path: () => `${get(nostrUrl)}?type=signEvent`,
        onRequest: (event) => Promise.resolve(event),
        onResponse: async (response: WebMessage<NostrEvent>) => {
            const res = response.getResultOrThrow()
            delete (res as any).KeyId;
            return res;
        }
    })

    registerEndpoint({
        id: Endpoints.GetRelays,
        method: 'GET',
        path: () => `${get(nostrUrl)}?type=getRelays`,
        onRequest: () => Promise.resolve(),
        onResponse: (response) => Promise.resolve(response)
    })

    registerEndpoint({
        id: Endpoints.SetRelay,
        method: 'POST',
        path: () => `${get(nostrUrl)}?type=relay`,
        onRequest: (relay:NostrRelay) => Promise.resolve(relay),
        onResponse: (response) => Promise.resolve(response)
    })

    registerEndpoint({
        id: Endpoints.CreateId,
        method: 'PUT',
        path: () => `${get(nostrUrl)}?type=identity`,
        onRequest: (identity:NostrIdentiy) => Promise.resolve(identity),
        onResponse: async (response: WebMessage<NostrEvent>) => response.getResultOrThrow()
    })

    registerEndpoint({
        id: Endpoints.UpdateId,
        method: 'PATCH',
        path: () => `${get(nostrUrl)}?type=identity`,
        onRequest: (identity:NostrIdentiy) => {
            const id = cloneDeep(identity) as any;
            delete id.Created;
            delete id.LastModified;
            return Promise.resolve(id)
        },
        onResponse: async (response: WebMessage<NostrEvent>) => response.getResultOrThrow()
    })

    registerEndpoint({
        id: Endpoints.UpdateProfile,
        method: 'POST',
        path: () => `${get(accUrl)}`,
        onRequest: (profile: UserProfile) => Promise.resolve(cloneDeep(profile)),
        onResponse: async (response: WebMessage<string>) => response.getResultOrThrow()
    })

    //Register nip04 events
    registerEndpoint({
        id:Endpoints.Encrypt,
        method:'POST',
        path: () => `${get(nostrUrl)}?type=encrypt`,
        onRequest: (data: NostrEvent) => Promise.resolve(data),
        onResponse: async (response: WebMessage<string>) => response.getResultOrThrow()
    })

    registerEndpoint({
        id:Endpoints.Decrypt,
        method:'POST',
        path: () => `${get(nostrUrl)}?type=decrypt`,
        onRequest: (data: NostrEvent) => Promise.resolve(data),
        onResponse: async (response: WebMessage<string>) => response.getResultOrThrow()
    })

    return { execRequest }
}