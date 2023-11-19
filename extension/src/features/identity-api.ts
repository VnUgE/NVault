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
import { ref, watch } from "vue";
import { useSession } from "@vnuge/vnlib.browser";
import { get, set, useToggle, watchOnce } from "@vueuse/core";
import { find, isArray } from "lodash";

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
            const selectedKey = ref<NostrPubKey | undefined>();
            const [ onTriggered , triggerChange ] = useToggle()

            //Clear the selected key if the user logs out
            watch(loggedIn, (li) => li ? null : selectedKey.value = undefined)

            return {
                //Identity is only available in options context
                createIdentity: optionsOnly(async (id: NostrPubKey) => {
                    await execRequest<NostrPubKey>(Endpoints.CreateId, id)
                    triggerChange()
                }),
                updateIdentity: optionsOnly(async (id: NostrPubKey) => {
                    await execRequest<NostrPubKey>(Endpoints.UpdateId, id)
                    triggerChange()
                }),
                deleteIdentity: optionsOnly(async (key: NostrPubKey) => {
                    await execRequest<NostrPubKey>(Endpoints.DeleteKey, key);
                    triggerChange()
                }),
                selectKey: popupAndOptionsOnly((key: NostrPubKey): Promise<void> => {
                    selectedKey.value = key;
                    return Promise.resolve()
                }),
                getAllKeys: async (): Promise<NostrPubKey[]> => {
                    if(!get(loggedIn)){
                        return []
                    }
                    //Get the keys from the server
                    const data = await execRequest<NostrPubKey[]>(Endpoints.GetKeys);

                    //Response must be an array of key objects
                    if (!isArray(data)) {
                        return [];
                    }

                    //Make sure the selected keyid is in the list, otherwise unselect the key
                    if (data?.length > 0) {
                        if (!find(data, k => k.Id === selectedKey.value?.Id)) {
                            set(selectedKey, undefined);
                        }
                    }

                    return [...data]
                },
                getPublicKey: (): Promise<NostrPubKey | undefined> => {
                    return Promise.resolve(selectedKey.value);
                },
                waitForChange: () => {
                    console.log('Waiting for change')
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