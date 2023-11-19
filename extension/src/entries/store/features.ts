
import 'pinia'
import { } from 'lodash'
import { PiniaPluginContext } from 'pinia'
import { type Tabs, tabs } from 'webextension-polyfill'

import {
    SendMessageHandler,
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

import { RuntimeContext, createPort } from '../../webext-bridge'
import { ref } from 'vue'
import { onWatchableChange } from '../../features/types'

export type BgPlugins = ReturnType<typeof usePlugins>
export type BgPluginState<T> = { plugins: BgPlugins } & T

declare module 'pinia' {
    export interface PiniaCustomProperties {
        plugins: BgPlugins
        currentTab: Tabs.Tab | undefined
    }
}

const usePlugins = (sendMessage: SendMessageHandler) => {
    //Create plugin wrapping function
    const { use } = useForegoundFeatures(sendMessage)

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

export const useBackgroundPiniaPlugin = (context: RuntimeContext) => {
    //Create port for context
    const { sendMessage } = createPort(context)
    const plugins = usePlugins(sendMessage)
    const { user } = plugins;

    const currentTab = ref<Tabs.Tab | undefined>(undefined)

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
            console.log("Settings changed")
        }, { immediate: true })
      

        const initTab = async () => {

            if(!tabs){
                return;
            }

            //Get the current tab
            const [active] = await tabs.query({ active: true, currentWindow: true })
            currentTab.value = active

            //Watch for changes to the current tab
            tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
                //If the url changed, update the current tab
                if (changeInfo.url) {
                    currentTab.value = tab
                }
            })

            tabs.onActivated.addListener(async ({ tabId }) => {
                //Get the tab
                const tab = await tabs.get(tabId)
                //Update the current tab
                currentTab.value = tab
            })
        }
       
       
        initTab()

        return{
            plugins,
            currentTab,
        }
    }
} 