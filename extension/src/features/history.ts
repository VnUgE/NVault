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

import { shallowRef } from "vue";
import { watchDebounced, set, get, useToggle } from '@vueuse/core'
import { EventEntry, NostrEvent, Watchable } from "./types";
import { FeatureApi, BgRuntime, IFeatureExport, exportForegroundApi, optionsOnly } from "./framework";
import { AppSettings } from "./settings";
import { waitForChangeFn } from "./util";
import { Endpoints } from "./server-api";
import { useSession } from "@vnuge/vnlib.browser";
import {  } from "lodash";

export interface SignedNEvent extends NostrEvent {
    readonly signature: string    
}

export interface HistoryApi extends FeatureApi, Watchable{
    getEvents: () => Promise<EventEntry[]>;
    deleteEvent: (entry: EventEntry) => Promise<void>;
    refresh: () => Promise<void>;
}

export const useHistoryApi = () : IFeatureExport<AppSettings, HistoryApi> => {
    return{
        background: ({ state }: BgRuntime<AppSettings>): HistoryApi =>{
            const { loggedIn } = useSession();
            const { execRequest } = state.useServerApi();
            const [ onRefresh, refresh ] = useToggle()

            const history = shallowRef<EventEntry[]>([]);

            //Watch for login changes and manual refreshes
            watchDebounced([loggedIn, onRefresh], async ([li]) => {

                if(!li){
                    set(history, [])
                    return
                }
                
                //load history from server
                history.value = await execRequest(Endpoints.GetHistory);

            }, { debounce: 1000 })

            return{
                waitForChange:waitForChangeFn([history]),

                getEvents: () => Promise.resolve(history.value),
                deleteEvent: optionsOnly(async (entry: EventEntry) => {
                    await execRequest(Endpoints.DeleteSingleEvent, entry)
                    refresh()
                }),
                refresh () {
                    refresh()
                    return Promise.resolve()
                }
             }
        },
        foreground: exportForegroundApi<HistoryApi>([
            'waitForChange',
            'getEvents',
            'deleteEvent',
            'refresh'
        ])
    }
}

//Listen for messages