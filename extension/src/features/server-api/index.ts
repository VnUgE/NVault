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


import { Ref } from "vue"
import { get } from '@vueuse/core'
import { type WebMessage, type UserProfile } from "@vnuge/vnlib.browser"
import { initEndponts } from "./endpoints"
import { cloneDeep } from "lodash"
import type { EncryptionRequest, NostrEvent, NostrPubKey, NostrRelay } from "../types"

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

export interface ExecRequestHandler{
    (id: Endpoints.GetKeys):Promise<NostrPubKey[]>
    (id: Endpoints.DeleteKey, key: NostrPubKey):Promise<void>
    (id: Endpoints.SignEvent, event: NostrEvent):Promise<NostrEvent>
    (id: Endpoints.GetRelays):Promise<NostrRelay[]>
    (id: Endpoints.SetRelay, relay: NostrRelay):Promise<NostrRelay>
    (id: Endpoints.Encrypt, data: EncryptionRequest):Promise<string>
    (id: Endpoints.Decrypt, data: EncryptionRequest):Promise<string>
    (id: Endpoints.CreateId, identity: NostrPubKey):Promise<NostrPubKey>
    (id: Endpoints.UpdateId, identity: NostrPubKey):Promise<NostrPubKey>
    (id: Endpoints.UpdateProfile, profile: UserProfile):Promise<string>
}

export interface ServerApi{
    execRequest: ExecRequestHandler
}

export const useServerApi = (nostrUrl: Ref<string>, accUrl: Ref<string>): ServerApi => {
    const { registerEndpoint, execRequest } = initEndponts()

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
        path: (key: NostrPubKey) => `${get(nostrUrl)}?type=identity&key_id=${key.Id}`,
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
        onRequest: (identity: NostrPubKey) => Promise.resolve(identity),
        onResponse: async (response: WebMessage<NostrEvent>) => response.getResultOrThrow()
    })

    registerEndpoint({
        id: Endpoints.UpdateId,
        method: 'PATCH',
        path: () => `${get(nostrUrl)}?type=identity`,
        onRequest: (identity:NostrPubKey) => {
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
        onRequest: (data: EncryptionRequest) => Promise.resolve(data),
        onResponse: async (response: WebMessage<{ ciphertext:string, iv:string }>) =>{
            const { ciphertext, iv } = response.getResultOrThrow()
            return `${ciphertext}?iv=${iv}`
        }
    })

    registerEndpoint({
        id:Endpoints.Decrypt,
        method:'POST',
        path: () => `${get(nostrUrl)}?type=decrypt`,
        onRequest: (data: EncryptionRequest) => Promise.resolve(data),
        onResponse: async (response: WebMessage<string>) => response.getResultOrThrow()
    })

    return { execRequest }
}