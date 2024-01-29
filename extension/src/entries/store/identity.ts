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

import 'pinia'
import {  } from 'lodash'
import { PiniaPluginContext } from 'pinia'
import { onWatchableChange, type NostrPubKey } from '../../features'
import { shallowRef } from 'vue';

declare module 'pinia' {
    export interface PiniaCustomStateProperties {
        allKeys: NostrPubKey[];
        selectedKey: NostrPubKey | undefined;      
    }
}

export const identityPlugin = ({ store }: PiniaPluginContext) => {

    const { identity } = store.plugins

    const originalReset = store.$reset.bind(store)
    const allKeys = shallowRef<NostrPubKey[]>([])
    const selectedKey = shallowRef<NostrPubKey | undefined>(undefined)

    onWatchableChange(identity, async () => {
        allKeys.value = await identity.getAllKeys();
        selectedKey.value = await identity.getPublicKey();
    }, { immediate:true })

    return {
        $reset(){
            originalReset()
            allKeys.value = []
            selectedKey.value = undefined
        },
        selectedKey,
        allKeys,
        selectKey: identity.selectKey,
        deleteIdentity: identity.deleteIdentity,
        createIdentity: identity.createIdentity,
        updateIdentity: identity.updateIdentity,
        refreshIdentities: identity.refreshKeys
    }
}