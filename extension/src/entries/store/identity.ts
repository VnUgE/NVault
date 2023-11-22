
import 'pinia'
import {  } from 'lodash'
import { PiniaPluginContext } from 'pinia'
import { NostrPubKey } from '../../features'
import { shallowRef } from 'vue';
import { onWatchableChange } from '../../features/types';

declare module 'pinia' {
    export interface PiniaCustomStateProperties {
        allKeys: NostrPubKey[];
        selectedKey: NostrPubKey | undefined;
        deleteIdentity(key: Partial<NostrPubKey>): Promise<void>;
        createIdentity(id: Partial<NostrPubKey>): Promise<NostrPubKey>;
        updateIdentity(id: NostrPubKey): Promise<NostrPubKey>;
        selectKey(key: NostrPubKey): Promise<void>;
    }
}


export const identityPlugin = ({ store }: PiniaPluginContext) => {

    const { identity } = store.plugins

    const originalReset = store.$reset.bind(store)
    const allKeys = shallowRef<NostrPubKey[]>([])
    const selectedKey = shallowRef<NostrPubKey | undefined>(undefined)

    onWatchableChange(identity, async () => {
        console.log('Identity changed')
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
        updateIdentity: identity.updateIdentity
    }
}