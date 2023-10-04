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
import { get } from '@vueuse/core'
import { WebMessage } from "@vnuge/vnlib.browser"
import { initEndponts } from "./endpoints"
import { NostrEvent } from "../types"

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
        path: () => `${get(nostrUrl)}?type=getKeys`,
        onRequest: () => Promise.resolve(),
        onResponse: (response) => Promise.resolve(response)
    })

    registerEndpoint({
        id: Endpoints.DeleteKey,
        method: 'DELETE',
        path: ([key]) => `${get(nostrUrl)}?type=identity&key_id=${key.Id}`,
        onRequest: () => Promise.resolve(),
        onResponse: (response: WebMessage) => response.getResultOrThrow()
    })

    registerEndpoint({
        id: Endpoints.SignEvent,
        method: 'POST',
        path: () => `${get(nostrUrl)}?type=signEvent`,
        onRequest: ([event]) => Promise.resolve(event),
        onResponse: async (response: WebMessage<NostrEvent>) => {
            return response.getResultOrThrow()
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
        onRequest: ([relay]) => Promise.resolve(relay),
        onResponse: (response) => Promise.resolve(response)
    })

    return {
        execRequest
    }
}