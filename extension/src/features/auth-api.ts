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

import { AxiosInstance } from "axios";
import { get, watchOnce } from "@vueuse/core";
import { computed } from "vue";
import { usePkiAuth, useSession, useUser } from "@vnuge/vnlib.browser";
import { type FeatureApi, type BgRuntime, type IFeatureExport, exportForegroundApi, popupAndOptionsOnly, popupOnly } from "./framework";
import type { ClientStatus } from "./types";
import type { AppSettings } from "./settings";
import type { JsonObject } from "type-fest";

export interface ProectedHandler<T extends JsonObject> {
    (message: T): Promise<any>
}

export interface MessageHandler<T extends JsonObject> {
    (message: T): Promise<any>
}

export interface ApiMessageHandler<T extends JsonObject> {
    (message: T, apiHandle: { axios: AxiosInstance }): Promise<any>
}

export interface UserApi extends FeatureApi {
    login: (token: string) => Promise<boolean>
    logout: () => Promise<void>
    getProfile: () => Promise<any>
    getStatus: () => Promise<ClientStatus>
    waitForChange: () => Promise<void>
}

export const useAuthApi = (): IFeatureExport<AppSettings, UserApi> => {

    return {
        background: ({ state, onInstalled }:BgRuntime<AppSettings>): UserApi =>{
            const { loggedIn, clearLoginState } = useSession();
            const { currentConfig } = state
            const { logout, getProfile, heartbeat, userName } = useUser();
            const currentPkiPath = computed(() => `${currentConfig.value.accountBasePath}/pki`)
            
            //Use pki login controls
            const { login } = usePkiAuth(currentPkiPath as any)

            //We can send post messages to the server heartbeat endpoint to get status
            const runHeartbeat = async () => {
                //Only run if the api thinks its logged in, and config is enabled
                if (!loggedIn.value || currentConfig.value.heartbeat !== true) {
                    return
                }

                try {
                    //Post against the heartbeat endpoint
                    await heartbeat()
                }
                catch (error: any) {
                    if (error.response?.status === 401 || error.response?.status === 403) {
                        //If we get a 401, the user is no longer logged in
                        clearLoginState()
                    }
                }
            }

            //Install hook for interval
            onInstalled(() => {
                //Configure interval to run every 5 minutes to update the status
                setInterval(runHeartbeat, 60 * 1000);

                //Run immediately
                runHeartbeat();

                return Promise.resolve();
            })

            return {
                login: popupOnly(async (token: string): Promise<boolean> => {
                    //Perform login
                    await login(token)
                    //load profile
                    getProfile()
                    return true;
                }),
                logout: popupOnly(async (): Promise<void> => {
                    //Perform logout
                    await logout()
                    //Cleanup after logout
                    clearLoginState()
                }),
                getProfile: popupAndOptionsOnly(getProfile),
                async getStatus (){
                    return {
                        //Logged in if the cookie is set and the api flag is set
                        loggedIn: get(loggedIn),
                        //username
                        userName: get(userName),
                    } as ClientStatus
                },
                async waitForChange(){
                    return new Promise((resolve) => watchOnce([currentConfig, loggedIn] as any, () => resolve()))
                }
            }
        },
        foreground: exportForegroundApi<UserApi>([
            'login',
            'logout',
            'getProfile',
            'getStatus',
            'waitForChange'
        ]),
    } 
}