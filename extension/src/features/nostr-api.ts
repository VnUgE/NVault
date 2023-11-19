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
import { NostrRelay,  EventMessage, NostrEvent } from './types'
import { FeatureApi, BgRuntime, IFeatureExport, optionsOnly, exportForegroundApi } from "./framework";
import { AppSettings } from "./settings";
import { useTagFilter } from "./tagfilter-api";


/**
 * The NostrApi is the foreground api for nostr events via 
 * the background script.
 */
export interface NostrApi extends FeatureApi {
    getRelays: () => Promise<NostrRelay[]>;
    signEvent: (event: NostrEvent) => Promise<NostrEvent | undefined>;
    setRelay: (relay: NostrRelay) => Promise<NostrRelay | undefined>;
    nip04Encrypt: (data: EventMessage) => Promise<string>;
    nip04Decrypt: (data: EventMessage) => Promise<string>;
}

export const useNostrApi = (): IFeatureExport<AppSettings, NostrApi> => {

    return{
        background: ({ state }: BgRuntime<AppSettings>) =>{
           
            const { execRequest } = useServerApi(state);
            const { filterTags } = useTagFilter()

            return {
                getRelays: async (): Promise<NostrRelay[]> => {
                    //Get preferred relays for the current user
                    const data = await execRequest<NostrRelay[]>(Endpoints.GetRelays)
                    return [...data]
                },
                signEvent: async (req: NostrEvent): Promise<NostrEvent | undefined> => {

                    //If tag filter is enabled, filter before continuing
                    if(state.currentConfig.value.tagFilter){
                        await filterTags(req)
                    }
                   
                    //Sign the event
                    const event = await execRequest<NostrEvent>(Endpoints.SignEvent, req);
                    return event;
                },
                nip04Encrypt: async (data: EventMessage): Promise<string> => {
                    return execRequest<string>(Endpoints.Encrypt, data);
                },
                nip04Decrypt: (data: EventMessage): Promise<string> => {
                    return execRequest<string>(Endpoints.Decrypt, data);
                },
                setRelay: optionsOnly((relay: NostrRelay): Promise<NostrRelay | undefined> => {
                    return execRequest<NostrRelay>(Endpoints.SetRelay, relay)
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
