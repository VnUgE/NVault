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

import { runtime, storage } from "webextension-polyfill";
import { useSettings } from "./settings";
import { isEqual, remove } from "lodash";
import { ref } from "vue";

const evHistory = ref([]);

export interface HistoryEvent extends Object{

}

export const useHistory = (() => {
    const { currentConfig } = useSettings();

    const pushEvent = (event: HistoryEvent) => {

        //Limit the history to 50 events
        if (evHistory.value.length > currentConfig.value.maxHistory) {
            evHistory.value.shift();
        }

        evHistory.value.push(event);

        //Save the history but dont wait for it
        storage.local.set({ eventHistory: evHistory });
    }

    const getHistory = (): HistoryEvent[] => {
        return [...evHistory.value];
    }

    const clearHistory = () => {
        evHistory.value.length = 0;
        storage.local.set({ eventHistory: evHistory });
    }

    const removeItem = (event: HistoryEvent) => {
        //Remove the event from the history
        remove(evHistory.value, (ev) => isEqual(ev, event));
        //Save the history but dont wait for it
        storage.local.set({ eventHistory: evHistory });
    }

    const onStartup = async () => {
        //Recover the history array
        const { eventHistory } = await storage.local.get('eventHistory');

        //Push the history into the array
        evHistory.value.push(...eventHistory);
    }

    //Reload the history on startup
    runtime.onStartup.addListener(onStartup);
    runtime.onInstalled.addListener(onStartup);

    return () =>{
        return {
            pushEvent,
            getHistory,
            clearHistory,
            removeItem
        }
    }
})()


//Listen for messages