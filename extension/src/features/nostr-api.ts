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

import { cloneDeep } from "lodash";
import { Endpoints } from "./server-api";
import { type FeatureApi, type BgRuntime, type IFeatureExport, optionsOnly, exportForegroundApi } from "./framework";
import { type AppSettings } from "./settings";
import { useTagFilter } from "./tagfilter-api";
import type { NostrRelay, EncryptionRequest, NostrEvent } from './types';


/**
 * The NostrApi is the foreground api for nostr events via 
 * the background script.
 */
export interface NostrApi extends FeatureApi {
    getRelays: () => Promise<NostrRelay[]>;
    signEvent: (event: NostrEvent) => Promise<NostrEvent | undefined>;
    setRelay: (relay: NostrRelay) => Promise<NostrRelay | undefined>;
    nip04Encrypt: (data: EncryptionRequest) => Promise<string>;
    nip04Decrypt: (data: EncryptionRequest) => Promise<string>;
}

export const useNostrApi = (): IFeatureExport<AppSettings, NostrApi> => {

    return{
        background: ({ state }: BgRuntime<AppSettings>) =>{
           
            const { execRequest } = state.useServerApi();
            const { filterTags } = useTagFilter(state)

            return {
                getRelays: async (): Promise<NostrRelay[]> => {
                    //Get preferred relays for the current user
                    const [...relays] = await execRequest(Endpoints.GetRelays)
                    return relays;
                },
                signEvent: async (req: NostrEvent): Promise<NostrEvent | undefined> => {

                    //Store copy to prevent mutation
                    req = cloneDeep(req)

                    //If tag filter is enabled, filter before continuing
                    if(state.currentConfig.value.tagFilter){
                        await filterTags(req)
                    }
                   
                    //Sign the event
                    const event = await execRequest(Endpoints.SignEvent, req);
                    return event;
                },
                nip04Encrypt: async (data: EncryptionRequest): Promise<string> => {
                    const message: EncryptionRequest = {
                        content: data.content,
                        KeyId: data.KeyId,
                        pubkey: data.pubkey
                    }
                    return execRequest(Endpoints.Encrypt, message);
                },
                nip04Decrypt: (data: EncryptionRequest): Promise<string> => {
                    const message: EncryptionRequest = {
                        content: data.content,
                        KeyId: data.KeyId,
                        pubkey: data.pubkey
                    }
                    return execRequest(Endpoints.Decrypt, message);
                },
                setRelay: optionsOnly((relay: NostrRelay): Promise<NostrRelay | undefined> => {
                    return execRequest(Endpoints.SetRelay, relay)
                }),
            }
        },
        foreground: exportForegroundApi([
            'getRelays',
            'signEvent',
            'setRelay',
            'nip04Encrypt',
            'nip04Decrypt'
        ])
    }
}
