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

import { storage } from "webextension-polyfill"
import { defaultsDeep } from 'lodash'
import { configureApi, debugLog } from '@vnuge/vnlib.browser'
import { MaybeRefOrGetter, readonly, Ref, shallowRef, watch } from "vue";
import { JsonObject } from "type-fest";
import { Watchable } from "./types";
import { BgRuntime, FeatureApi, optionsOnly, IFeatureExport, exportForegroundApi, popupAndOptionsOnly } from './framework'
import { get, set, toRefs } from "@vueuse/core";
import { waitForChangeFn, useStorage } from "./util";
import { ServerApi, useServerApi } from "./server-api";

export interface PluginConfig extends JsonObject {
    readonly apiUrl: string;
    readonly accountBasePath: string;
    readonly nostrEndpoint: string;
    readonly heartbeat: boolean;
    readonly maxHistory: number;
    readonly tagFilter: boolean;
    readonly authPopup: boolean;
}

//Default storage config
const defaultConfig : PluginConfig = Object.freeze({
    apiUrl: import.meta.env.VITE_API_URL,
    accountBasePath: import.meta.env.VITE_ACCOUNTS_BASE_PATH,
    nostrEndpoint: import.meta.env.VITE_NOSTR_ENDPOINT,
    heartbeat: import.meta.env.VITE_HEARTBEAT_ENABLED === 'true',
    maxHistory: 50,
    tagFilter: true,
    authPopup: true,
});

export interface AppSettings{
    saveConfig(config: PluginConfig): void;
    useStorageSlot<T>(slot: string, defaultValue: MaybeRefOrGetter<T>): Ref<T>;
    useServerApi(): ServerApi,
    readonly currentConfig: Readonly<Ref<PluginConfig>>;
}

export interface SettingsApi extends FeatureApi, Watchable {
    getSiteConfig: () => Promise<PluginConfig>;
    setSiteConfig: (config: PluginConfig) => Promise<PluginConfig>;
    setDarkMode: (darkMode: boolean) => Promise<void>;
    getDarkMode: () => Promise<boolean>;
}

export const useAppSettings = (): AppSettings => {

    const _storageBackend = storage.local;
    const store = useStorage<PluginConfig>(_storageBackend, 'siteConfig', defaultConfig);

    //Merge the default config for nullables with the current config on startyup
    defaultsDeep(store.value, defaultConfig);

    watch(store, (config, _) => {
        //Configure the vnlib api
        configureApi({
            session: {
                cookiesEnabled: false,
                browserIdSize: 32,
            },
            user: {
                accountBasePath: config.accountBasePath,
            },
            axios: {
                baseURL: config.apiUrl,
                tokenHeader: import.meta.env.VITE_WEB_TOKEN_HEADER,
            },
            storage: localStorage
        })

    }, { deep: true })

    //Save the config and update the current config
    const saveConfig = (config: PluginConfig) => set(store, config);

    //Reactive urls for server api
    const { accountBasePath, nostrEndpoint } = toRefs(store)
    const serverApi = useServerApi(nostrEndpoint, accountBasePath)

    return {
        saveConfig,
        currentConfig: readonly(store),
        useStorageSlot: <T>(slot: string, defaultValue: MaybeRefOrGetter<T>) => {
            return useStorage<T>(_storageBackend, slot, defaultValue)
        },
        useServerApi: () => serverApi
    }
}

export const useSettingsApi = () : IFeatureExport<AppSettings, SettingsApi> =>{

    return{
        background: ({ state }: BgRuntime<AppSettings>) => {

            const _darkMode = shallowRef(false);

            return {
                waitForChange: waitForChangeFn([state.currentConfig, _darkMode]),
                getSiteConfig: () => Promise.resolve(state.currentConfig.value),
                setSiteConfig: optionsOnly(async (config: PluginConfig): Promise<PluginConfig> => {

                    //Save the config
                    state.saveConfig(config);

                    debugLog('Config settings saved!');

                    //Return the config
                    return get(state.currentConfig)
                }),
                setDarkMode: popupAndOptionsOnly(async (darkMode: boolean) => {
                    _darkMode.value = darkMode 
                }),
                getDarkMode: async () => get(_darkMode),
            }
        },
        foreground: exportForegroundApi([
            'getSiteConfig',
            'setSiteConfig',
            'setDarkMode',
            'getDarkMode',
            'waitForChange'
        ]) 
    }
}