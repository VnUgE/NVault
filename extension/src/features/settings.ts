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
import { defaultTo, defaultsDeep, defer, find, isArray, isEmpty, noop } from 'lodash'
import { configureApi, debugLog, useAppDataApi, useSession } from '@vnuge/vnlib.browser'
import { computed, type MaybeRef, readonly, Ref, shallowRef, watch } from "vue";
import { JsonObject } from "type-fest";
import { Watchable } from "./types";
import { BgRuntime, FeatureApi, optionsOnly, IFeatureExport, exportForegroundApi } from './framework'
import { get, set, watchDebounced, useToggle, watchThrottled, controlledRef } from "@vueuse/core";
import { waitForChangeFn, useStorage } from "./util";
import { ServerApi, useServerApi } from "./server-api";

export interface PluginConfig extends JsonObject {
    readonly discoveryUrl: string;
    readonly heartbeat: boolean;
    readonly maxHistory: number;
    readonly tagFilter: boolean;
    readonly authPopup: boolean;
}

//Default storage config
const defaultConfig : PluginConfig = Object.freeze({
    discoveryUrl: import.meta.env.VITE_DISCOVERY_URL,
    heartbeat: import.meta.env.VITE_HEARTBEAT_ENABLED === 'true',
    maxHistory: 50,
    tagFilter: true,
    authPopup: true
});

export interface EndpointConfig extends JsonObject {
   readonly apiBaseUrl: string;
   readonly accountBasePath: string;
   readonly nostrBasePath: string;
   readonly dataSyncPath?: string;
}

export interface ConfigStatus {
    readonly epConfig: EndpointConfig;
    readonly isValid: boolean;
}

export interface AppSettings{
    saveConfig(config: PluginConfig): void;
    useStorageSlot<T>(slot: string, defaultValue: MaybeRef<T>): Ref<T>;
    useServerSlot<T>(slot: string, silent: boolean, defaultValue: MaybeRef<T>): {
        state: Ref<T>,
        sync: () => void
    }
    useServerApi(): ServerApi,
    readonly status: Readonly<Ref<ConfigStatus>>;
    readonly currentConfig: Readonly<Ref<PluginConfig>>;
    readonly serverEndpoints: Readonly<Ref<EndpointConfig>>;
}

export interface SettingsApi extends FeatureApi, Watchable {
    getSiteConfig: () => Promise<PluginConfig>;
    setSiteConfig: (config: PluginConfig) => Promise<PluginConfig>;
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
    const store = useStorage<PluginConfig>(_storageBackend, 'siteConfig', defaultConfig);
    const endpointConfig = shallowRef<EndpointConfig>({nostrBasePath: '', accountBasePath: '', apiBaseUrl: ''})
    const syncEndpoint = computed(() => get(endpointConfig).dataSyncPath || '/app-data')
    const serverSyncApi = useAppDataApi(syncEndpoint);

    const status = computed<ConfigStatus>(() => {
        //get current endpoint config
        const { nostrBasePath, accountBasePath } = get(endpointConfig);
        return {
            epConfig: get(endpointConfig),
            isValid: !isEmpty(nostrBasePath) && !isEmpty(accountBasePath)
        }
    })

    const discoverAndSetEndpoints = async (discoveryUrl: string, epConfig: Ref<EndpointConfig | undefined>) => {
        const { endpoints } = await discoverNvaultServer(discoveryUrl);

        const urls: EndpointConfig = {
            apiBaseUrl: new URL(discoveryUrl).origin,
            accountBasePath: find(endpoints, p => p.name == "account")?.path || "/account",
            nostrBasePath: find(endpoints, p => p.name == "nostr")?.path || "/nostr",
            dataSyncPath: find(endpoints, p => p.name == "sync")?.path
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
        useStorageSlot: <T>(slot: string, defaultValue: MaybeRef<T>) => {
            return useStorage<T>(_storageBackend, slot, defaultValue)
        },
        useServerSlot: <T>(slot: string, silent: boolean, defaultValue: MaybeRef<T>) => {
            const session = useSession();

            const [onManualTrigger, sync] = useToggle()
            const state = controlledRef<T>(get(defaultValue));
            
            const syncFromServer = async () => {
                if (session.loggedIn.value === false) 
                    return get(defaultValue);
                
                const data = await serverSyncApi.get<T>(slot, false);
                delete (data as any).getResultOrThrow;
                return defaultsDeep(data, get(defaultValue))
            }

            const syncToServer = async (value: T) => {
                if (session.loggedIn.value === false) return;
                await serverSyncApi.set(slot, value, false);
            }

            const syncStateForward = () => defer(syncToServer, state.value)
            const syncState = async () => silent ? state.silentSet(await syncFromServer()) : state.set(await syncFromServer())

            watchThrottled([endpointConfig, session.loggedIn, onManualTrigger], syncState, { throttle: 500 })
            watchDebounced(state, syncStateForward, { debounce: 500 })

            return { sync, state }
        },
        useServerApi: () => serverApi,
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
                getStatus: () => {
                    //Since value is computed it needs to be manually unwrapped
                    const { isValid, epConfig } = get(state.status);
                    return Promise.resolve({ isValid, epConfig })
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
            'waitForChange',
            'getStatus',
            'testServerAddress'
        ]) 
    }
}