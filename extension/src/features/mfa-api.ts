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

import { get, set, useToggle, watchDebounced } from "@vueuse/core";
import { computed, shallowRef } from "vue";
import {  } from "lodash";
import { useSession, useMfaConfig, MfaMethod } from "@vnuge/vnlib.browser";
import type { TotpUpdateMessage, Watchable } from "./types";
import type { AppSettings } from "./settings";
import { type FeatureApi, type BgRuntime, type IFeatureExport, exportForegroundApi, optionsOnly } from "./framework";
import { waitForChangeFn } from "./util";

export type MfaUpdateResult = TotpUpdateMessage

export interface MfaConfigApi extends FeatureApi, Watchable {
    getMfaMethods: () => Promise<MfaMethod[]>
    enableOrUpdate: (method: MfaMethod, password: string) => Promise<MfaUpdateResult>
    disableMethod: (method: MfaMethod, password: string) => Promise<void>
    refresh: () => Promise<void>
}

export const useMfaConfigApi = (): IFeatureExport<AppSettings, MfaConfigApi> => {

    return {
        background: ({ state }: BgRuntime<AppSettings>): MfaConfigApi => {
            const { loggedIn } = useSession();
            const { currentConfig } = state
           
            const [onRefresh, refresh] = useToggle()

            const mfaPath = computed(() => `${currentConfig.value.accountBasePath}/mfa`)
            const mfaConfig = useMfaConfig(mfaPath)
            const mfaEnabledMethods = shallowRef<MfaMethod[]>([])

            //Update enabled methods
            watchDebounced([currentConfig, loggedIn, onRefresh], async () => {
                if(!loggedIn.value){
                    set(mfaEnabledMethods, [])
                    return
                }
                const methods = await mfaConfig.getMethods()
                set(mfaEnabledMethods, methods)
            }, { debounce: 100  })

            return {
                waitForChange: waitForChangeFn([currentConfig, loggedIn, mfaEnabledMethods]),
                
                getMfaMethods: optionsOnly(() => {
                    return Promise.resolve(get(mfaEnabledMethods))
                }),
                enableOrUpdate: optionsOnly(async (method: MfaMethod, password: string) => {
                    //Exec request to update mfa method
                    const result = await mfaConfig.initOrUpdateMethod<MfaUpdateResult>(method, password)
                    refresh()
                    return result.getResultOrThrow()
                }),
                disableMethod: optionsOnly(async (method: MfaMethod, password: string) => {
                    await mfaConfig.disableMethod(method, password)
                    refresh()
                }),
                refresh() {
                    refresh()
                    return Promise.resolve()
                }
            }
        },
        foreground: exportForegroundApi<MfaConfigApi>([
            'waitForChange',
            'getMfaMethods',
            'enableOrUpdate',            
            'disableMethod',
            'refresh'
        ]),
    }
}