
import 'pinia'
import {  } from 'lodash'
import { PiniaPluginContext } from 'pinia'
import { computed, shallowRef } from 'vue';
import { onWatchableChange } from '../../features/types';
import { type AllowedOriginStatus } from '../../features/nip07allow-api';

declare module 'pinia' {
    export interface PiniaCustomProperties {
        isTabAllowed: boolean;
        currentOrigin: string | undefined;
        allowedOrigins: Array<string>;
        isOriginProtectionOn: boolean;
        allowOrigin(origin?:string): Promise<void>;
        dissallowOrigin(origin?:string): Promise<void>;
        disableOriginProtection(): Promise<void>;
        setOriginProtection(value: boolean): Promise<void>;
    }
}

export const originPlugin = ({ store }: PiniaPluginContext) => {
   
    const { plugins } = store
    const status = shallowRef<AllowedOriginStatus>()

    onWatchableChange(plugins.allowedOrigins, async () => {
        //Update the status
        status.value = await plugins.allowedOrigins.getStatus()
    }, { immediate: true })

    return {
        allowedOrigins: computed(() => status.value?.allowedOrigins || []),
        isTabAllowed: computed(() => status.value?.isAllowed == true),
        currentOrigin: computed(() => status.value?.currentOrigin),
        isOriginProtectionOn: computed(() => status.value?.enabled == true),
        //Push to the allow list, will trigger a change if needed
        allowOrigin: plugins.allowedOrigins.addOrigin,
        //Remove from allow list, will trigger a change if needed
        dissallowOrigin: plugins.allowedOrigins.removeOrigin,
        setOriginProtection: plugins.allowedOrigins.enable
    }
}
