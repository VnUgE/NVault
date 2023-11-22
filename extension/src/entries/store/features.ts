
import 'pinia'
import { } from 'lodash'
import { PiniaPluginContext } from 'pinia'

import {
    useAuthApi,
    useHistoryApi,
    useIdentityApi,
    useNostrApi,
    useLocalPki,
    usePkiApi,
    useSettingsApi,
    useForegoundFeatures,
    useEventTagFilterApi,
    useInjectAllowList
} from "../../features"

import { onWatchableChange } from '../../features/types'
import { ChannelContext } from '../../messaging'

export type BgPlugins = ReturnType<typeof usePlugins>
export type BgPluginState<T> = { plugins: BgPlugins } & T

declare module 'pinia' {
    export interface PiniaCustomProperties {
        plugins: BgPlugins
    }
}

const usePlugins = (context: ChannelContext) => {
    //Create plugin wrapping function
    const { use } = useForegoundFeatures(context)

    return {
        settings: use(useSettingsApi),
        user: use(useAuthApi),
        identity: use(useIdentityApi),
        nostr: use(useNostrApi),
        history: use(useHistoryApi),
        localPki: use(useLocalPki),
        pki: use(usePkiApi),
        tagFilter: use(useEventTagFilterApi),
        allowedOrigins: use(useInjectAllowList)
    }
}

export const useBackgroundPiniaPlugin = (context: ChannelContext) => {
    //Create port for context
    const plugins = usePlugins(context)
    const { user } = plugins;

    //Plugin store
    return ({ store }: PiniaPluginContext) => {

        //watch for status changes
        onWatchableChange(user, async () => {
            //Get status update and set the values
            const { loggedIn, userName } = await user.getStatus();
            store.loggedIn = loggedIn;
            store.userName = userName;

        }, { immediate: true })

        //Wait for settings changes
        onWatchableChange(plugins.settings, async () => {
            //Update settings and dark mode on change
            store.settings = await plugins.settings.getSiteConfig();
            store.darkMode = await plugins.settings.getDarkMode();
        }, { immediate: true })

        return{
            plugins,
        }
    }
} 