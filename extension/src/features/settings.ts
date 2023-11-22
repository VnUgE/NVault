// Copyright (C) 2023 Vaughn Nugent
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
import { isEmpty, merge } from 'lodash'
import { configureApi, debugLog } from '@vnuge/vnlib.browser'
import { readonly, ref, Ref } from "vue";
import { JsonObject } from "type-fest";
import { Watchable, useSingleSlotStorage } from "./types";
import { BgRuntime, FeatureApi, optionsOnly, IFeatureExport, exportForegroundApi, popupAndOptionsOnly } from './framework'
import { get, watchOnce } from "@vueuse/core";

export interface PluginConfig extends JsonObject {
    readonly apiUrl: string;
    readonly accountBasePath: string;
    readonly nostrEndpoint: string;
    readonly heartbeat: boolean;
    readonly maxHistory: number;
    readonly tagFilter: boolean,
}

//Default storage config
const defaultConfig : PluginConfig = {
    apiUrl: import.meta.env.VITE_API_URL,
    accountBasePath: import.meta.env.VITE_ACCOUNTS_BASE_PATH,
    nostrEndpoint: import.meta.env.VITE_NOSTR_ENDPOINT,
    heartbeat: import.meta.env.VITE_HEARTBEAT_ENABLED === 'true',
    maxHistory: 50,
    tagFilter: true,
};

export interface AppSettings{
    getCurrentConfig: () => Promise<PluginConfig>;
    restoreApiSettings: () => Promise<void>;
    saveConfig: (config: PluginConfig) => Promise<void>;
    readonly currentConfig: Readonly<Ref<PluginConfig>>;
}

export interface SettingsApi extends FeatureApi, Watchable {
    getSiteConfig: () => Promise<PluginConfig>;
    setSiteConfig: (config: PluginConfig) => Promise<PluginConfig>;
    setDarkMode: (darkMode: boolean) => Promise<void>;
    getDarkMode: () => Promise<boolean>;
}

export const useAppSettings = (): AppSettings => {
    const currentConfig = ref<PluginConfig>({} as PluginConfig);
    const store = useSingleSlotStorage<PluginConfig>(storage.local, 'siteConfig', defaultConfig);

    const getCurrentConfig = async () => {

        const siteConfig = await store.get()

        //Store a default config if none exists
        if (isEmpty(siteConfig)) {
            await store.set(defaultConfig);
        }

        //Merge the default config with the site config
        return merge(defaultConfig, siteConfig)
    }

    const restoreApiSettings = async () => {
        //Set the current config
        const current = await getCurrentConfig();
        currentConfig.value = current;

        //Configure the vnlib api
        configureApi({
            session: {
                cookiesEnabled: false,
                browserIdSize: 32,
            },
            user: {
                accountBasePath: current.accountBasePath,
            },
            axios: {
                baseURL: current.apiUrl,
                tokenHeader: import.meta.env.VITE_WEB_TOKEN_HEADER,
            },
            storage: localStorage
        })
    }

    const saveConfig = async (config: PluginConfig) => {
        //Save the config and update the current config
        await store.set(config);
        currentConfig.value = config;
    }

    return {
        getCurrentConfig,
        restoreApiSettings,
        saveConfig,
        currentConfig:readonly(currentConfig)
    }
}

export const useSettingsApi = () : IFeatureExport<AppSettings, SettingsApi> =>{

    return{
        background: ({ state, onConnected, onInstalled }: BgRuntime<AppSettings>) => {

            const _darkMode = ref(false);

            onInstalled(async () => {
                await state.restoreApiSettings();
                debugLog('Server settings restored from storage');
            })

            onConnected(async () => {
                //refresh the config on connect
                await state.restoreApiSettings();
            })

            return {

                getSiteConfig: () => state.getCurrentConfig(),

                setSiteConfig: optionsOnly(async (config: PluginConfig): Promise<PluginConfig> => {

                    //Save the config
                    await state.saveConfig(config);

                    //Restore the api settings
                    await state.restoreApiSettings();

                    debugLog('Config settings saved!');

                    //Return the config
                    return state.currentConfig.value
                }),

                setDarkMode: popupAndOptionsOnly(async (darkMode: boolean) => {
                    console.log('Setting dark mode to', darkMode, 'from', _darkMode.value)
                    _darkMode.value = darkMode 
                }),
                getDarkMode: async () => get(_darkMode),

                waitForChange: () => {
                    return new Promise((resolve) => watchOnce([state.currentConfig, _darkMode] as any, () => resolve()))
                },
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