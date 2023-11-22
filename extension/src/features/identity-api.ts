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

import { Endpoints, useServerApi } from "./server-api";
import { NostrPubKey, Watchable } from "./types";
import { 
    type FeatureApi, 
    type IFeatureExport,
    type BgRuntime,
    optionsOnly, 
    popupAndOptionsOnly, 
    exportForegroundApi 
} from "./framework";
import { AppSettings } from "./settings";
import { shallowRef, watch } from "vue";
import { useSession } from "@vnuge/vnlib.browser";
import { set, useToggle, watchOnce } from "@vueuse/core";
import { defer, isArray } from "lodash";

export interface IdentityApi extends FeatureApi, Watchable {
    createIdentity: (identity: NostrPubKey) => Promise<NostrPubKey>
    updateIdentity: (identity: NostrPubKey) => Promise<NostrPubKey>
    deleteIdentity: (key: NostrPubKey) => Promise<void>
    getAllKeys: () => Promise<NostrPubKey[]>;
    getPublicKey: () => Promise<NostrPubKey | undefined>;
    selectKey: (key: NostrPubKey) => Promise<void>;
}

export const useIdentityApi = (): IFeatureExport<AppSettings, IdentityApi> => {
    return{
        background: ({ state }: BgRuntime<AppSettings>) =>{
            const { execRequest } = useServerApi(state);
            const { loggedIn } = useSession();

            //Get the current selected key
            const selectedKey = shallowRef<NostrPubKey | undefined>();
            const allKeys = shallowRef<NostrPubKey[]>([]);
            const [ onTriggered , triggerChange ] = useToggle()

            const keyLoadWatchLoop = async () => {
                while(true){
                    //Load keys from server if logged in
                    if(loggedIn.value){
                        const [...keys] = await execRequest(Endpoints.GetKeys);
                        allKeys.value = isArray(keys) ? keys : [];
                    }
                    else{
                        //Clear all keys when logged out
                        allKeys.value = [];
                    }

                    //Wait for changes to trigger a new key-load
                    await new Promise((resolve) => watchOnce([onTriggered, loggedIn] as any, () => resolve(null)))
                }
            }

            defer(keyLoadWatchLoop)

            //Clear the selected key if the user logs out
            watch(loggedIn, (li) => li ? null : selectedKey.value = undefined)

            return {
                //Identity is only available in options context
                createIdentity: optionsOnly(async (id: NostrPubKey) => {
                    await execRequest(Endpoints.CreateId, id)
                    triggerChange()
                }),
                updateIdentity: optionsOnly(async (id: NostrPubKey) => {
                    await execRequest(Endpoints.UpdateId, id)
                    triggerChange()
                }),
                deleteIdentity: optionsOnly(async (key: NostrPubKey) => {
                    await execRequest(Endpoints.DeleteKey, key);
                    triggerChange()
                }),
                selectKey: popupAndOptionsOnly((key: NostrPubKey): Promise<void> => {
                    set(selectedKey, key);
                    return Promise.resolve()
                }),
                getAllKeys: (): Promise<NostrPubKey[]> => {
                    return Promise.resolve(allKeys.value);
                },
                getPublicKey: (): Promise<NostrPubKey | undefined> => {
                    return Promise.resolve(selectedKey.value);
                },
                waitForChange: () => {
                    return new Promise((resolve) => watchOnce([selectedKey, loggedIn, onTriggered] as any, () => resolve()))
                }
            }  
        },
        foreground: exportForegroundApi([
            'createIdentity',
            'updateIdentity',
            'deleteIdentity',
            'getAllKeys',
            'getPublicKey',
            'selectKey',
            'waitForChange'
        ])
    }
}