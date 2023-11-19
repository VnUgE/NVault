
import 'pinia'
import {  } from 'lodash'
import { PiniaPluginContext } from 'pinia'
import { NostrPubKey } from '../../features'
import { ref } from 'vue';
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

    const allKeys = ref<NostrPubKey[]>([])
    const selectedKey = ref<NostrPubKey | undefined>(undefined)

    onWatchableChange(identity, async () => {
        allKeys.value = await identity.getAllKeys();
        //Get the current key
        selectedKey.value = await identity.getPublicKey();
        console.log('Selected key is now', selectedKey.value)
    }, { immediate:true })

    return {
        selectedKey,
        allKeys,
        selectKey: identity.selectKey,
        deleteIdentity: identity.deleteIdentity,
        createIdentity: identity.createIdentity,
        updateIdentity: identity.updateIdentity
    }
}