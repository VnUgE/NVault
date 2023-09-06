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

import { runtime, storage } from "webextension-polyfill"
import { isEmpty, isEqual, merge } from 'lodash'
import { configureApi, debugLog } from '@vnuge/vnlib.browser'
import { readonly, ref } from "vue";
import { BridgeMessage } from "webext-bridge";
import { JsonObject } from "type-fest";

export interface PluginConfig extends JsonObject {
    readonly apiUrl: string;
    readonly accountBasePath: string;
    readonly nostrEndpoint: string;
    readonly heartbeat: boolean;
    readonly maxHistory: number;
    readonly darkMode: boolean;
    readonly autoInject: boolean;
}

//Default storage config
const defaultConfig : PluginConfig = {
    apiUrl: import.meta.env.VITE_API_URL,
    accountBasePath: import.meta.env.VITE_ACCOUNTS_BASE_PATH,
    nostrEndpoint: import.meta.env.VITE_NOSTR_ENDPOINT,
    heartbeat: import.meta.env.VITE_HEARTBEAT_ENABLED === 'true',
    maxHistory: 50,
    darkMode: false,
    autoInject: true
};

export const useSettings = (() =>{

    const currentConfig = ref<PluginConfig>({} as PluginConfig);

    const getCurrentConfig = async () => {
        const { siteConfig } = await storage.local.get('siteConfig');

        //Store a default config if none exists
        if(isEmpty(siteConfig)){
            await storage.local.set({ siteConfig: defaultConfig });
        }

        //Merge the default config with the site config
        return merge(defaultConfig, siteConfig)
    }

    const restoreApiSettings = async () => {
        //Set the current config
        currentConfig.value = await getCurrentConfig();;

        //Configure the vnlib api
        configureApi({
            session: {
                cookiesEnabled: false,
                bidSize: 32,
                storage: localStorage
            },
            user: {
                accountBasePath: currentConfig.value.accountBasePath,
                storage: localStorage,
            },
            axios: {
                baseURL: currentConfig.value.apiUrl,
                tokenHeader: import.meta.env.VITE_WEB_TOKEN_HEADER,
            }
        })
    }

    const saveConfig = async (config: PluginConfig) : Promise<void> => {
        await storage.local.set({ siteConfig: config });
    }

    const onGetSiteConfig = async ({ } :BridgeMessage<any>): Promise<PluginConfig> => {
        return { ...currentConfig.value }
    }

    const onSetSitConfig = async ({ sender, data }: BridgeMessage<PluginConfig>) : Promise<void> => {
        //Config messages should only come from the options page
        if (sender.context !== 'options') {
            throw new Error('Unauthorized');
        }

        //Save the config
        await saveConfig(data);

        //Restore the api settings
        restoreApiSettings();

        debugLog('Config settings saved!');
    }

    runtime.onInstalled.addListener(() => {
        restoreApiSettings();
        debugLog('Server settings restored from storage');
    });

    runtime.onConnect.addListener(async () => {
        //refresh the config on connect
        currentConfig.value = await getCurrentConfig();
    })

    return () =>{
        return{
            getCurrentConfig,
            restoreApiSettings,
            saveConfig,
            currentConfig:readonly(currentConfig),
            onGetSiteConfig,
            onSetSitConfig
        }
    }
})()