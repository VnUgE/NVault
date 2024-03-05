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
import { defaultsDeep, defer, find, isArray, isEmpty } from 'lodash'
import { configureApi, debugLog } from '@vnuge/vnlib.browser'
import { computed, MaybeRefOrGetter, readonly, Ref, shallowRef, watch } from "vue";
import { JsonObject } from "type-fest";
import { Watchable } from "./types";
import { BgRuntime, FeatureApi, optionsOnly, IFeatureExport, exportForegroundApi, popupAndOptionsOnly } from './framework'
import { get, set } from "@vueuse/core";
import { waitForChangeFn, useStorage } from "./util";
import { ServerApi, useServerApi } from "./server-api";

export interface PluginConfig extends JsonObject {
    readonly discoveryUrl: string;
    readonly heartbeat: boolean;
    readonly maxHistory: number;
    readonly tagFilter: boolean;
    readonly authPopup: boolean;
    readonly darkMode: boolean;
}

//Default storage config
const defaultConfig : PluginConfig = Object.freeze({
    discoveryUrl: import.meta.env.VITE_DISCOVERY_URL,
    heartbeat: import.meta.env.VITE_HEARTBEAT_ENABLED === 'true',
    maxHistory: 50,
    tagFilter: true,
    authPopup: true,
    darkMode: false,
});

export interface EndpointConfig extends JsonObject {
   readonly apiBaseUrl: string;
   readonly accountBasePath: string;
   readonly nostrBasePath: string;
}

export interface ConfigStatus {
    readonly epConfig: EndpointConfig;
    readonly isDarkMode: boolean;
    readonly isValid: boolean;
}

export interface AppSettings{
    saveConfig(config: PluginConfig): void;
    useStorageSlot<T>(slot: string, defaultValue: MaybeRefOrGetter<T>): Ref<T>;
    useServerApi(): ServerApi,
    setDarkMode(darkMode: boolean): void;
    readonly status: Readonly<Ref<ConfigStatus>>;
    readonly currentConfig: Readonly<Ref<PluginConfig>>;
    readonly serverEndpoints: Readonly<Ref<EndpointConfig>>;
}

export interface SettingsApi extends FeatureApi, Watchable {
    getSiteConfig: () => Promise<PluginConfig>;
    setSiteConfig: (config: PluginConfig) => Promise<PluginConfig>;
    setDarkMode: (darkMode: boolean) => Promise<void>;
    getStatus: () => Promise<ConfigStatus>;
    testServerAddress: (address: string) => Promise<boolean>;
}

interface ServerDiscoveryResult{
    readonly endpoints: {
        readonly name: string;
        readonly path: string;
    }[]
}

const discoverNvaultServer = async (discoveryUrl: string): Promise<ServerDiscoveryResult> => {
    const res = await fetch(discoveryUrl)
    return await res.json() as ServerDiscoveryResult;
}

export const useAppSettings = (): AppSettings => {

    const _storageBackend = storage.local;
    const _darkMode = shallowRef(false);
    const store = useStorage<PluginConfig>(_storageBackend, 'siteConfig', defaultConfig);
    const endpointConfig = shallowRef<EndpointConfig>({nostrBasePath: '', accountBasePath: '', apiBaseUrl: ''})

    const status = computed<ConfigStatus>(() => {
        //get current endpoint config
        const { nostrBasePath, accountBasePath } = get(endpointConfig);
        return {
            epConfig: get(endpointConfig),
            isDarkMode: get(_darkMode),
            isValid: !isEmpty(nostrBasePath) && !isEmpty(accountBasePath)
        }
    })

    const discoverAndSetEndpoints = async (discoveryUrl: string, epConfig: Ref<EndpointConfig | undefined>) => {
        const { endpoints } = await discoverNvaultServer(discoveryUrl);

        const urls: EndpointConfig = {
            apiBaseUrl: new URL(discoveryUrl).origin,
            accountBasePath: find(endpoints, p => p.name == "account")?.path || "/account",
            nostrBasePath: find(endpoints, p => p.name == "nostr")?.path || "/nostr",
        };

        //Set once the urls are discovered
        set(epConfig, urls);
    }

    //Merge the default config for nullables with the current config on startyup
    defaultsDeep(store.value, defaultConfig);

    //Watch for changes to the discovery url, then cause a discovery
    watch([store], ([{ discoveryUrl }]) => {
        defer(async () => { 
            await discoverAndSetEndpoints(discoveryUrl, endpointConfig)
            const { accountBasePath, apiBaseUrl } = get(endpointConfig);
            if(!isEmpty(accountBasePath) && !isEmpty(apiBaseUrl)){
                configureApi({
                    session: {
                        cookiesEnabled: false,
                        browserIdSize: 32,
                    },
                    user: { accountBasePath },
                    axios: {
                        baseURL: apiBaseUrl,
                        tokenHeader: import.meta.env.VITE_WEB_TOKEN_HEADER,
                    },
                    storage: localStorage
                })
            }
        })
    })

    //Save the config and update the current config
    const saveConfig = (config: PluginConfig) => set(store, config);
   
    //Local reactive server api
    const serverApi = useServerApi(endpointConfig)

    return {
        saveConfig,
        status, 
        currentConfig: readonly(store),
        useStorageSlot: <T>(slot: string, defaultValue: MaybeRefOrGetter<T>) => {
            return useStorage<T>(_storageBackend, slot, defaultValue)
        },
        useServerApi: () => serverApi,
        setDarkMode: (darkMode: boolean) => set(_darkMode, darkMode),
        serverEndpoints: readonly(endpointConfig)
    }
}

export const useSettingsApi = () : IFeatureExport<AppSettings, SettingsApi> =>{

    return{
        background: ({ state }: BgRuntime<AppSettings>) => {
            return {
                waitForChange: waitForChangeFn([state.currentConfig, state.status]),
                getSiteConfig: () => Promise.resolve(state.currentConfig.value),
                setSiteConfig: optionsOnly(async (config: PluginConfig): Promise<PluginConfig> => {

                    //Save the config
                    state.saveConfig(config);

                    debugLog('Config settings saved!');

                    //Return the config
                    return get(state.currentConfig)
                }),
                setDarkMode: popupAndOptionsOnly((darkMode: boolean) => {
                    state.setDarkMode(darkMode);
                    return Promise.resolve();
                }),
                getStatus: () => {
                    //Since value is computed it needs to be manually unwrapped
                    const { isDarkMode, isValid, epConfig } = get(state.status);
                    return Promise.resolve({ isDarkMode, isValid, epConfig })
                },
                testServerAddress: optionsOnly(async (url: string) => {
                    const data = await discoverNvaultServer(url)
                    return isArray(data?.endpoints) && !isEmpty(data.endpoints);
                })
            }
        },
        foreground: exportForegroundApi([
            'getSiteConfig',
            'setSiteConfig',
            'setDarkMode',
            'waitForChange',
            'getStatus',
            'testServerAddress'
        ]) 
    }
}