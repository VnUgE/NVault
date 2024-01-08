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

import { Endpoints } from "./server-api";
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
import { shallowRef } from "vue";
import { useSession } from "@vnuge/vnlib.browser";
import { set, useToggle, watchDebounced } from "@vueuse/core";
import { isArray } from "lodash";
import { waitForChange, waitForChangeFn } from "./util";

export interface IdentityApi extends FeatureApi, Watchable {
    createIdentity: (identity: NostrPubKey) => Promise<NostrPubKey>
    updateIdentity: (identity: NostrPubKey) => Promise<NostrPubKey>
    deleteIdentity: (key: NostrPubKey) => Promise<void>
    getAllKeys: () => Promise<NostrPubKey[]>;
    getPublicKey: () => Promise<NostrPubKey | undefined>;
    selectKey: (key: NostrPubKey) => Promise<void>;
    refreshKeys: () => Promise<void>;
}

export const useIdentityApi = (): IFeatureExport<AppSettings, IdentityApi> => {
    return{
        background: ({ state }: BgRuntime<AppSettings>) =>{
            const { execRequest } = state.useServerApi();
            const { loggedIn } = useSession();

            //Get the current selected key
            const selectedKey = shallowRef<NostrPubKey | undefined>();
            const allKeys = shallowRef<NostrPubKey[]>([]);
            const [ onKeyUpdateTriggered , triggerKeyUpdate ] = useToggle()

            watchDebounced([onKeyUpdateTriggered, loggedIn], async () => {
                //Load keys from server if logged in
                if (loggedIn.value) {
                    const [...keys] = await execRequest(Endpoints.GetKeys);
                    allKeys.value = isArray(keys) ? keys : [];
                }
                else {
                    //Clear all keys when logged out
                    allKeys.value = [];

                    //Clear the selected key if the user becomes logged out
                    selectedKey.value = undefined;
                }

                //Wait for changes to trigger a new key-load
                await waitForChange([ loggedIn, onKeyUpdateTriggered ])
            }, { debounce: 100 })

            return {
                //Identity is only available in options context
                createIdentity: optionsOnly(async (id: NostrPubKey) => {
                   const newKey = await execRequest(Endpoints.CreateId, id)
                    triggerKeyUpdate()
                    return newKey
                }),
                updateIdentity: optionsOnly(async (id: NostrPubKey) => {
                    const updated = await execRequest(Endpoints.UpdateId, id)
                    triggerKeyUpdate()
                    return updated
                }),
                deleteIdentity: optionsOnly(async (key: NostrPubKey) => {
                    await execRequest(Endpoints.DeleteKey, key);
                    triggerKeyUpdate()
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
                refreshKeys: () => {
                    triggerKeyUpdate()
                    return Promise.resolve()
                },
                waitForChange: waitForChangeFn([selectedKey, loggedIn, allKeys])
            }
        },
        foreground: exportForegroundApi([
            'createIdentity',
            'updateIdentity',
            'deleteIdentity',
            'getAllKeys',
            'getPublicKey',
            'selectKey',
            'waitForChange',
            'refreshKeys'
        ])
    }
}