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

import 'pinia'
import { filter, find } from 'lodash'
import { PiniaPluginContext, storeToRefs } from 'pinia'
import { computed, shallowRef, type Ref } from 'vue'

import {
    PrStatus,
    onWatchableChange,
    PermissionRequest
} from "../../features"
import { get } from '@vueuse/core'
import { AutoAllowRule } from '../../features/permissions'

export interface PermissionApi {
    getRules(): AutoAllowApi
    readonly pending: PermissionRequest[]
    readonly all: PermissionRequest[]
    readonly windowPending: PermissionRequest | undefined
    readonly isPopup: boolean
}

export interface AutoAllowApi{
    readonly rules: Ref<AutoAllowRule[]>,
    readonly rulesForCurrentOrigin: Ref<AutoAllowRule[]>
}

declare module 'pinia' {
    export interface PiniaCustomProperties {
        permissions: PermissionApi
    }
}

export const permissionsPlugin = ({ store }: PiniaPluginContext) => {

    const { permission } = store.plugins

    const { currentOrigin } = storeToRefs(store)

    const all = shallowRef<PermissionRequest[]>([])
    const activeRequests = computed(() => filter(all.value, r => r.status == PrStatus.Pending))
    const windowPending = shallowRef<PermissionRequest | undefined>()
 

    const closeIfPopup = () => {
        const windowQueryArgs = new URLSearchParams(window.location.search)
        if (windowQueryArgs.has("closeable")) {
            window.close()
        }
    }

    const getPendingWindowRequest = () => {
        const uuid = getWindowUuid()
        const req = get(activeRequests)
        return find(req, r => r.uuid == uuid)
    }

    const getWindowUuid = () => {
        const queryArgs = new URLSearchParams(window.location.search)
        return queryArgs.get("uuid")
    }

    //watch for status changes
    onWatchableChange(permission, async () => {
        //get latest requests and current ruleset
        all.value = await permission.getRequests()
       

        //update window pending request
        windowPending.value = getPendingWindowRequest()

        //if there are no more pending requests, close the popup
        if (activeRequests.value.length == 0) {
            closeIfPopup()
        }

        //If the window's request is no longer pending, close the popup
        if (getWindowUuid() && !get(windowPending)){
            closeIfPopup()
        }

    }, { immediate: true })

    /**
     * Get rules is now a separate function for only instances where
     *  rules need to be accessed. This is to avoid the overhead of
     *  an interval reactive update when rules are not needed.
     */
    const getRules = (): AutoAllowApi => {

        const rules = shallowRef<AutoAllowRule[]>([])
        const rulesForCurrentOrigin = computed(() => filter(rules.value, r => r.origin == get(currentOrigin)))

        onWatchableChange(permission, async () => {
            rules.value = await permission.getRules()
        })

        //also update rules on an interval
        setInterval(async () => rules.value = await permission.getRules(), 2000)

        return {
            rules,
            rulesForCurrentOrigin
        }
    }
    
    return {
      permissions:{
            all,
            getRules,
            pending: activeRequests,
            isPopup: getWindowUuid() !== null,
        }
    }
} 