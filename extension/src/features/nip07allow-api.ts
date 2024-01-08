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

import { tabs, type Tabs } from "webextension-polyfill";
import { Watchable } from "./types";
import { defaultTo, filter, includes, isEqual } from "lodash";
import { BgRuntime, FeatureApi, IFeatureExport, exportForegroundApi, popupAndOptionsOnly } from "./framework";
import { AppSettings } from "./settings";
import { set, get, toRefs } from "@vueuse/core";
import { computed, shallowRef } from "vue";
import { waitForChangeFn } from "./util";

interface AllowedSites{
    origins: string[];
    enabled: boolean;
}
export interface AllowedOriginStatus{
    readonly allowedOrigins: string[];
    readonly enabled: boolean;
    readonly currentOrigin?: string;
    readonly isAllowed: boolean;
}

export interface InjectAllowlistApi extends FeatureApi, Watchable {
    addOrigin(origin?: string): Promise<void>;
    removeOrigin(origin?: string): Promise<void>;
    getStatus(): Promise<AllowedOriginStatus>;
    enable(value: boolean): Promise<void>;
}

export const useInjectAllowList = (): IFeatureExport<AppSettings, InjectAllowlistApi> => {
    return {
        background: ({ state }: BgRuntime<AppSettings>) => {

            const store = state.useStorageSlot<AllowedSites>('nip07-allowlist', { origins: [], enabled: true });
            const { origins, enabled } = toRefs(store)

            const { currentOrigin, currentTab } = (() => {

                const currentTab = shallowRef<Tabs.Tab | undefined>(undefined)
                const currentOrigin = computed(() => currentTab.value?.url ? new URL(currentTab.value.url).origin : undefined)

                //Watch for changes to the current tab
                tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
                    //If the url changed, update the current tab
                    if (changeInfo.url) {
                        currentTab.value = tab
                    }
                })

                tabs.onActivated.addListener(async ({ tabId }) => {
                    //Get the tab
                    const tab = await tabs.get(tabId)
                    //Update the current tab
                    currentTab.value = tab
                })
                return { currentTab, currentOrigin }
            })()

            const isOriginAllowed = (origin?: string): boolean => {
                //If protection is not enabled, allow all
                if(enabled.value == false){
                    return true;
                }
                //if no origin specified, use current origin
                origin = defaultTo(origin, currentOrigin.value)

                //If no origin, return false
                if (!origin) {
                    return false;
                }

                //Default to origin only
                const originOnly = new URL(origin).origin
                return includes(origins.value, originOnly)
            }

            const addOrigin = async (origin?: string): Promise<void> => {
                //if no origin specified, use current origin
                const newOrigin = defaultTo(origin, currentOrigin.value)
                if (!newOrigin) {
                    return;
                }

                const originOnly = new URL(newOrigin).origin

                //See if origin is already in the list
                if (!includes(origins.value, originOnly)) {
                    //Add to the list
                    origins.value.push(originOnly);

                    //If current tab was added, reload the tab
                    if (!origin) {
                        await tabs.reload(currentTab.value?.id)
                    }
                }
            }

            const removeOrigin = async (origin?: string): Promise<void> => {
                //Allow undefined to remove current origin
                const delOrigin = defaultTo(origin, currentOrigin.value)
                if (!delOrigin) {
                    return;
                }

                //Get origin part of url
                const delOriginOnly = new URL(delOrigin).origin
                const allowList = get(origins)

                //Remove the origin
                origins.value = filter(allowList, (o) => !isEqual(o, delOriginOnly));

                //If current tab was removed, reload the tab
                if (!origin) {
                    await tabs.reload(currentTab.value?.id)
                }
            }

            return {
                waitForChange: waitForChangeFn([currentTab, enabled, origins]),
                addOrigin: popupAndOptionsOnly(addOrigin),
                removeOrigin: popupAndOptionsOnly(removeOrigin),
                enable: popupAndOptionsOnly(async (value: boolean): Promise<void> => {
                    set(enabled, value)
                }),
                async getStatus(): Promise<AllowedOriginStatus> {
                    return{
                        allowedOrigins: get(origins),
                        enabled: get(enabled),
                        currentOrigin: get(currentOrigin),
                        isAllowed: isOriginAllowed()
                    }
                },
            }
        },
        foreground: exportForegroundApi([
            'addOrigin',
            'removeOrigin',
            'getStatus',
            'enable',
            'waitForChange'
        ])
    }
}