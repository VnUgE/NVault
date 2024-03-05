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

import { AxiosInstance } from "axios";
import { get, useTimeoutFn, set } from "@vueuse/core";
import { computed, shallowRef } from "vue";
import { clone, defer, delay } from "lodash";
import { IMfaFlowContinuiation, totpMfaProcessor, useMfaLogin, usePkiAuth, useSession, useUser,
     type IMfaSubmission, type IMfaMessage, type WebMessage 
} from "@vnuge/vnlib.browser";
import { type FeatureApi, type BgRuntime, type IFeatureExport, exportForegroundApi, popupAndOptionsOnly, popupOnly } from "./framework";
import { waitForChangeFn } from "./util";
import type { ClientStatus, Watchable } from "./types";
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

export interface UserApi extends FeatureApi, Watchable {
    login(username: string, password?: string): Promise<boolean>
    logout: () => Promise<void>
    getProfile: () => Promise<any>
    getStatus: () => Promise<ClientStatus>
    submitMfa: (submission: IMfaSubmission) => Promise<boolean>
}

export const useAuthApi = (): IFeatureExport<AppSettings, UserApi> => {

    return {
        background: ({ state }:BgRuntime<AppSettings>): UserApi =>{
            const { loggedIn, clearLoginState } = useSession();
            const { currentConfig, serverEndpoints } = state
            const { logout, getProfile, heartbeat, userName } = useUser();
            const currentPkiPath = computed(() => `${serverEndpoints.value.accountBasePath}/pki`)
            
            //Use pki login controls
            const pkiAuth = usePkiAuth(currentPkiPath as any)
            const { login } = useMfaLogin([ totpMfaProcessor() ])

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

            const mfaUpgrade = (() => {

                const store = shallowRef<IMfaFlowContinuiation | null>(null)
                const message = computed<IMfaMessage | null>(() =>{
                    if(!store.value){
                        return null
                    }
                    //clone the continuation to send to the popup
                    const cl = clone<Partial<IMfaFlowContinuiation>>(store.value)
                    //Remove the submit method from the continuation
                    delete cl.submit;
                    return cl as IMfaMessage
                })

                const { start, stop } = useTimeoutFn(() => set(store, null), 360 * 1000)

                return{
                    setContiuation(cont: IMfaFlowContinuiation){
                        //Store continuation for later
                        set(store, cont)
                        //Restart cleanup timer
                        start()
                    },
                    continuation: message,
                    async submit(submission: IMfaSubmission){
                        const cont = get(store)
                        if(!cont){
                            throw new Error('MFA login expired')
                        }
                        const response = await cont.submit(submission)
                        response.getResultOrThrow()

                        //Stop timer
                        stop()
                        //clear the continuation
                        defer(() => set(store, null))
                    }
                }
            })()

            //Configure interval to run every 5 minutes to update the status
            setInterval(runHeartbeat, 5 * 60 * 1000);
            delay(runHeartbeat, 1000)   //Delay 1 second to allow the extension to load

            return {
                waitForChange: waitForChangeFn([currentConfig, loggedIn, userName, mfaUpgrade.continuation]),
                login: popupOnly(async (usernameOrToken: string, password?: string): Promise<boolean> => {
                    
                    if(password){
                        const result = await login(usernameOrToken, password)
                        if ('getResultOrThrow' in result){
                            (result as WebMessage).getResultOrThrow()
                        }
                        
                        if((result as IMfaFlowContinuiation).submit){
                            //Capture continuation, store for submission for later, and set the continuation
                            mfaUpgrade.setContiuation(result as IMfaFlowContinuiation);
                            return true;
                        }

                        //Otherwise normal login
                    }
                    else{
                        //Perform login
                        await pkiAuth.login(usernameOrToken)
                    }
                  
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
                submitMfa: popupOnly(async (submission: IMfaSubmission): Promise<boolean> => {
                    const cont = get(mfaUpgrade.continuation)
                    if(!cont || cont.expired){
                        return false;
                    }

                    //Submit the continuation
                    await mfaUpgrade.submit(submission);

                    //load profile
                    getProfile()
                    return true;
                }),
                getProfile: popupAndOptionsOnly(getProfile),
                async getStatus (){
                    return {
                        //Logged in if the cookie is set and the api flag is set
                        loggedIn: get(loggedIn),
                        //username
                        userName: get(userName),
                        //mfa status
                        mfaStatus: get(mfaUpgrade.continuation)
                    } as ClientStatus
                },
            }
        },
        foreground: exportForegroundApi<UserApi>([
            'login',
            'logout',
            'getProfile',
            'getStatus',
            'waitForChange',
            'submitMfa',
        ]),
    } 
}