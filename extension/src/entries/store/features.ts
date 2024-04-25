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
import { PiniaPluginContext } from 'pinia'
import { computed, shallowRef } from 'vue'
import type { IMfaFlowContinuiation } from '@vnuge/vnlib.browser'
import {  } from '@vueuse/core'

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
    useInjectAllowList,
    onWatchableChange,
    useMfaConfigApi,
    usePermissionApi,
    usePreferencesApi,
    type AppPreferences
} from "../../features"

import type { ChannelContext } from '../../messaging'


declare module 'pinia' {
    export interface PiniaCustomProperties {
        plugins: BgPlugins
        mfaStatus: Partial<IMfaFlowContinuiation> | null
        isServerValid: boolean
        preferences: Readonly<Partial<AppPreferences>>
        setPreferences: (prefs: Partial<AppPreferences>) => void
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
        allowedOrigins: use(useInjectAllowList),
        mfaConfig: use(useMfaConfigApi),
        permission: use(usePermissionApi),
        preferences: use(usePreferencesApi)
    }
}

export type BgPlugins = ReturnType<typeof usePlugins>
export type BgPluginState<T> = { plugins: BgPlugins } & T

export const useBackgroundPiniaPlugin = (context: ChannelContext) => {
    //Create port for context
    const plugins = usePlugins(context)
    const { user, settings, history, preferences } = plugins;

    //Plugin store
    return ({ store }: PiniaPluginContext) => {

        const prefs = shallowRef<Partial<AppPreferences>>({})

        //watch for status changes
        onWatchableChange(user, async () => {
            //Get status update and set the values
            const { loggedIn, userName, mfaStatus } = await user.getStatus();
            store.loggedIn = loggedIn;
            store.userName = userName;
            store.mfaStatus = mfaStatus

        }, { immediate: true })

        //Wait for settings changes
        onWatchableChange(settings, async () => {
            //Update settings and dark mode on change
            store.settings = await settings.getSiteConfig();
            store.status = await settings.getStatus();
        }, { immediate: true })

        onWatchableChange(history, async () => {
            //Load event history
            store.eventHistory = await history.getEvents();
        }, { immediate: true })

        onWatchableChange(preferences, async () => {
            //Load preferences
            prefs.value = await preferences.read() || {};
        }, { immediate: true })

       const setPreferences = async (prefs: Partial<AppPreferences>) => {
            //get current preferences
            const current = await preferences.read() || {};
            console.log('Setting preferences', { ...current, ...prefs })
            //merge new preferences
            await preferences.write({ ...current, ...prefs });
       }
       
        return{
            plugins,
            preferences: prefs,
            isServerValid: computed(() => store.status.isValid),
            setPreferences
        }
    }
} 