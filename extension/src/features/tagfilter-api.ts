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

import { TaggedNostrEvent, Watchable } from "./types";
import { filter, isEmpty, isEqual, isRegExp } from "lodash";
import { BgRuntime, FeatureApi, IFeatureExport, exportForegroundApi } from "./framework";
import { AppSettings } from "./settings";
import { get, toRefs } from "@vueuse/core";
import { waitForChangeFn } from "./util";

interface EventTagFilteStorage {
    filters: string[];
    enabled: boolean;
}

export interface EventTagFilterApi extends FeatureApi, Watchable {
    filterTags(event: TaggedNostrEvent): Promise<void>;
    addFilter(tag: string): Promise<void>;
    removeFilter(tag: string): Promise<void>;
    addFilters(tags: string[]): Promise<void>;
    isEnabled(): Promise<boolean>;
    enable(value:boolean): Promise<void>;
}

export const useTagFilter = (settings: AppSettings): EventTagFilterApi => {
    //use storage
    const store = settings.useStorageSlot<EventTagFilteStorage>('tag-filter-struct', { filters: [], enabled: false });
    const { filters, enabled } = toRefs(store)

    return {
        waitForChange: waitForChangeFn([filters, enabled]),
        filterTags: async (event: TaggedNostrEvent): Promise<void> => {

            if(!event.tags){
                return;
            }

            if(isEmpty(event.tags)){
                return;
            }

            /*
             * Nostr events contain a nested array of tags, they may be any 
             * json type. The first element of the array should be the tag name
             * and the rest of the array is the tag data.  
             */
            const allowedTags = filter(event.tags, ([tagName]) => {
                if(!tagName){
                    return false;
                }

                if(!filters.value.length){
                    return true;
                }

                const asString = tagName.toString();

                for (const filter of get(filters)) {
                    //if the filter is a regex, test it, if it fails, its allowed
                    if (isRegExp(filter)) {
                        if (filter.test(asString)) {
                            return false;
                        }
                    }
                    //If the filter is a string, compare it, if it matches, it's not allowed
                    if (isEqual(filter, asString)) {
                        return false;
                    }
                }

                //Its allowed
                return true;
            })

            //overwrite tags array
            event.tags = allowedTags;
        },
        addFilter: async (tag: string) => {
            //add new filter to list
            filters.value.push(tag);
        },
        removeFilter: async (tag: string) => {
            //remove filter from list
            filters.value = filter(filters.value, t => !isEqual(t, tag));
        },
        addFilters: async (tags: string[]) => {
            //add new filters to list
            filters.value.push(...tags);
        },
        isEnabled: async () => {
            return enabled.value;
        },
        enable: async (value:boolean) => {
            enabled.value = value;
        }
    }
}

export const useEventTagFilterApi = (): IFeatureExport<AppSettings, EventTagFilterApi>  => {
    return{
        background: ({ state }: BgRuntime<AppSettings>) => {
            return{
                ...useTagFilter(state)
            }
        },
        foreground: exportForegroundApi([
            'filterTags',
            'addFilter',
            'removeFilter',
            'addFilters',
        ])
    }
}