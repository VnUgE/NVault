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

import { storage } from "webextension-polyfill";
import { NostrEvent, TaggedNostrEvent, useSingleSlotStorage } from "./types";
import { filter, isEmpty, isEqual, isRegExp } from "lodash";
import { BgRuntime, FeatureApi, IFeatureExport, exportForegroundApi } from "./framework";
import { AppSettings } from "./settings";

interface EventTagFilteStorage {
    filters: string[];
}

export interface EventTagFilterApi extends FeatureApi {
    filterTags(event: TaggedNostrEvent): Promise<void>;
    addFilter(tag: string): Promise<void>;
    removeFilter(tag: string): Promise<void>;
    addFilters(tags: string[]): Promise<void>;
}

export const useTagFilter = () => {
    //use storage
    const { get, set } = useSingleSlotStorage<EventTagFilteStorage>(storage.local, 'tag-filter-struct', { filters: [] });

    return {
        filterTags: async (event: TaggedNostrEvent): Promise<void> => {

            if(!event.tags){
                return;
            }

            //Load latest filter list
            const data = await get();

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

                if(!data.filters.length){
                    return true;
                }

                const asString = tagName.toString();

                for (const filter of data.filters) {
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
            const data = await get();
            //add new filter to list
            data.filters.push(tag);
            //save new config
            await set(data);
        },
        removeFilter: async (tag: string) => {
            const data = await get();
            //remove filter from list
            data.filters = filter(data.filters, (t) => !isEqual(t, tag));
            //save new config
            await set(data);
        },
        addFilters: async (tags: string[]) => {
            const data = await get();
            //add new filters to list
            data.filters.push(...tags);
            //save new config
            await set(data);
        }
    }
}

export const useEventTagFilterApi = (): IFeatureExport<AppSettings, EventTagFilterApi>  => {
    return{
        background: ({ }: BgRuntime<AppSettings>) => {
            return{
                ...useTagFilter()
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