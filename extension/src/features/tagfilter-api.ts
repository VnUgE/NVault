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

import { TaggedNostrEvent, Watchable } from "./types";
import { filter, isEmpty, isEqual, isRegExp } from "lodash";
import { BgRuntime, FeatureApi, IFeatureExport, exportForegroundApi } from "./framework";
import { AppSettings } from "./settings";
import { get, toRefs, set } from "@vueuse/core";
import { push, remove, waitForChangeFn } from "./util";

interface EventTagFilteStorage {
    filters: string[];
    enabled: boolean;
}

export interface EventTagFilterApi extends FeatureApi, Watchable {
    filterTags(event: TaggedNostrEvent): Promise<void>;
    addFilter(tag: string): Promise<void>;
    addFilter(tags: string[]): Promise<void>;
    removeFilter(tag: string): Promise<void>;
    isEnabled(): Promise<boolean>;
    enable(value:boolean): Promise<void>;
}

export const useEventTagFilterApi = (): IFeatureExport<AppSettings, EventTagFilterApi>  => {
    return{
        background: ({ state }: BgRuntime<AppSettings>) => {

            //use storage
            const store = state.useStorageSlot<EventTagFilteStorage>('tag-filter-struct', { filters: [], enabled: false });

            const { filters, enabled } = toRefs(store)

            return{
                waitForChange: waitForChangeFn([filters, enabled]),
                filterTags (event: TaggedNostrEvent): Promise<void> {

                    if (!event.tags || isEmpty(event.tags)) {
                        return Promise.resolve();
                    }

                    /*
                     * Nostr events contain a nested array of tags, they may be any 
                     * json type. The first element of the array should be the tag name
                     * and the rest of the array is the tag data.  
                     */
                    const allowedTags = filter(event.tags, ([tagName]) => {
                        //May be an undefined tag, so ignore it
                        if (!tagName) {
                            return false;
                        }

                        if (!filters.value.length) {
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
                    return Promise.resolve();
                },
                addFilter(tags: string | string[]) {
                    //add new filter to list
                    push(filters, tags)
                    return Promise.resolve();
                },
                removeFilter(tag: string) {
                    //remove filter from list
                    remove(filters, tag);
                    return Promise.resolve();
                },
                isEnabled: () => Promise.resolve(enabled.value),
                enable (value: boolean) {
                    set(enabled, value);
                    return Promise.resolve();
                }
            }
        },
        foreground: exportForegroundApi([
            'filterTags',
            'addFilter',
            'removeFilter',
            'isEnabled',
            'enable'
        ])
    }
}