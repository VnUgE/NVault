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


import { Ref } from "vue"
import { WebMessage } from "@vnuge/vnlib.browser"
import { initEndponts } from "./endpoints"
import { NostrEvent, NostrPubKey, NostrRelay } from "../types"

export enum Endpoints {
    GetKeys = 'getKeys',
    DeleteKey = 'deleteKey',
    SignEvent = 'signEvent',
    GetRelays = 'getRelays',
    SetRelay = 'setRelay',
    Encrypt = 'encrypt',
    Decrypt = 'decrypt',
}

export const initApi = (nostrUrl: Ref<string>) => {
    const { registerEndpoint, execRequest } = initEndponts()

    registerEndpoint({
        id: Endpoints.GetKeys,
        method: 'GET',
        path: () => `${nostrUrl.value}?type=getKeys`,
        onRequest: () => Promise.resolve(),
        onResponse: (response) => Promise.resolve(response)
    })

    registerEndpoint({
        id: Endpoints.DeleteKey,
        method: 'DELETE',
        path: (key: NostrPubKey) => `${nostrUrl.value}?type=identity&key_id=${key.Id}`,
        onRequest: () => Promise.resolve(),
        onResponse: (response: WebMessage) => response.getResultOrThrow()
    })

    registerEndpoint({
        id: Endpoints.SignEvent,
        method: 'POST',
        path: () => `${nostrUrl.value}?type=signEvent`,
        onRequest: (event: NostrEvent) => Promise.resolve(event),
        onResponse: async (response: WebMessage<NostrEvent>) => {
            return response.getResultOrThrow()
        }
    })

    registerEndpoint({
        id: Endpoints.GetRelays,
        method: 'GET',
        path: () => `${nostrUrl.value}?type=getRelays`,
        onRequest: () => Promise.resolve(),
        onResponse: (response) => Promise.resolve(response)
    })

    registerEndpoint({
        id: Endpoints.SetRelay,
        method: 'POST',
        path: () => `${nostrUrl.value}?type=relay`,
        onRequest: (relay: NostrRelay) => Promise.resolve(relay),
        onResponse: (response) => Promise.resolve(response)
    })

    return {
        execRequest
    }
}