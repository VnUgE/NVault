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

import { storage, tabs, type Tabs } from "webextension-polyfill";
import { Watchable, useSingleSlotStorage } from "./types";
import { defaultTo, filter, includes, isEqual } from "lodash";
import { BgRuntime, FeatureApi, IFeatureExport, exportForegroundApi, popupAndOptionsOnly } from "./framework";
import { AppSettings } from "./settings";
import { set, get, watchOnce, useToggle } from "@vueuse/core";
import { computed, ref } from "vue";

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
        background: ({ }: BgRuntime<AppSettings>) => {

            const store = useSingleSlotStorage<AllowedSites>(storage.local, 'nip07-allowlist', { origins: [], enabled: true });
            
            //watch current tab
            const allowedOrigins = ref<string[]>([])
            const protectionEnabled = ref<boolean>(true)
            const [manullyTriggered, trigger] = useToggle()

            const { currentOrigin, currentTab } = (() => {

                const currentTab = ref<Tabs.Tab | undefined>(undefined)
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

            const writeChanges = async () => {
                await store.set({ origins: [...get(allowedOrigins)], enabled: get(protectionEnabled) })
            }

            //Initial load
            store.get().then((data) => {
                allowedOrigins.value = data.origins
                protectionEnabled.value = data.enabled
            })

            const isOriginAllowed = (origin?: string): boolean => {
                //If protection is not enabled, allow all
                if(protectionEnabled.value == false){
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
                return includes(allowedOrigins.value, originOnly)
            }

            const addOrigin = async (origin?: string): Promise<void> => {
                //if no origin specified, use current origin
                const newOrigin = defaultTo(origin, currentOrigin.value)
                if (!newOrigin) {
                    return;
                }

                const originOnly = new URL(newOrigin).origin

                //See if origin is already in the list
                if (!includes(allowedOrigins.value, originOnly)) {
                    //Add to the list
                    allowedOrigins.value.push(originOnly);
                    trigger();

                    //Save changes
                    await writeChanges()

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
                const allowList = get(allowedOrigins)

                //Remove the origin
                allowedOrigins.value = filter(allowList, (o) => !isEqual(o, delOriginOnly));
                trigger();

                await writeChanges()

                //If current tab was removed, reload the tab
                if (!origin) {
                    await tabs.reload(currentTab.value?.id)
                }
            }
           

            return {
                addOrigin: popupAndOptionsOnly(addOrigin),
                removeOrigin: popupAndOptionsOnly(removeOrigin),
                enable: popupAndOptionsOnly(async (value: boolean): Promise<void> => {
                    set(protectionEnabled, value)
                    await writeChanges()
                }),
                async getStatus(): Promise<AllowedOriginStatus> {
                    return{
                        allowedOrigins: [...get(allowedOrigins)],
                        enabled: get(protectionEnabled),
                        currentOrigin: get(currentOrigin),
                        isAllowed: isOriginAllowed()
                    }
                },
                waitForChange:  () => {
                    //Wait for the trigger to change
                    return new Promise((resolve) => watchOnce([currentTab, protectionEnabled, manullyTriggered] as any, () => resolve()));
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