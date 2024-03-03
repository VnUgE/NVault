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

import { Mutable, get, set, toRefs, useTimestamp } from "@vueuse/core";
import { Ref } from "vue";
import { defaultTo, defaults, defer, filter, find, forEach, isEqual, isNil } from "lodash";
import { nanoid } from "nanoid";
import { debugLog, useSession } from "@vnuge/vnlib.browser";
import { type FeatureApi, type BgRuntime, type IFeatureExport, exportForegroundApi, optionsOnly } from "./framework";
import { remove, waitForChangeFn, waitOne } from "./util";
import { windows, runtime, Windows, tabs } from "webextension-polyfill";
import type { TotpUpdateMessage, Watchable } from "./types";
import type { AppSettings } from "./settings";

export interface AutoAllowRule{
    origin: string
    type: string
    readonly expires?: number
    readonly timestamp: number
}

export type PrType = string
export enum PrStatus{
    Pending,
    Approved,
    Denied
}

export enum CreateRuleType{
    AllowOnce,
    AllowForever,
    FiveMinutes,
    OneHour,
    OneDay,
    OneWeek,
    OneMonth,
}

export interface PermissionRequest{
    readonly uuid: string
    readonly origin: string
    readonly requestType: PrType
    readonly timestamp: number
    readonly status: PrStatus
}

export type MfaUpdateResult = TotpUpdateMessage

export interface PermissionApi extends FeatureApi, Watchable {
    getRequests(): Promise<PermissionRequest[]>   
    allow(requestId: string, addRule: CreateRuleType): Promise<void>
    deny(requestId: string): Promise<void>
    clearRequests(): Promise<void>
    requestAndWaitResult(request: Partial<PermissionRequest>): Promise<PrStatus>

    getRules(): Promise<AutoAllowRule[]>
    deleteRule(rule: AutoAllowRule): Promise<void>
    addRule(rule: AutoAllowRule): Promise<void>
}

interface PermissionSlot {
    requests: PermissionRequest[]
}

interface RuleSlot{
    rules: AutoAllowRule[]
}

const setExpirationRule = (expType: CreateRuleType): { expires?: number } => {
    switch (expType) {
        case CreateRuleType.AllowOnce:
        case CreateRuleType.AllowForever:
            return { }
        case CreateRuleType.FiveMinutes:
            return { expires: Date.now() + (5 * 60 * 1000) };
        case CreateRuleType.OneHour:
            return { expires: Date.now() + (60 * 60 * 1000) };
        case CreateRuleType.OneDay:
            return { expires: Date.now() + (24 * 60 * 60 * 1000) };
        case CreateRuleType.OneWeek:
            return { expires: Date.now() + (7 * 24 * 60 * 60 * 1000) };
        case CreateRuleType.OneMonth:
            return { expires: Date.now() + (30 * 24 * 60 * 60 * 1000) };        
    }
}

const useRuleSet = (slot: Ref<RuleSlot>) => {
    
    defaults(slot.value, { rules: [] })
    const { rules } = toRefs(slot)

    const trimExpiredRules = () => {
        const current = get(rules)
        const now = Date.now()
        const wo = filter(current, r => !r.expires || r.expires > now)
        //see if we need to update
        if (wo.length !== current.length) {
            set(rules, wo)
        }
        return wo
    }
    
    return{
        isAllowed: (request: PermissionRequest): boolean => {
            //find existing rule
            const rule = find(get(rules), r => isEqual(r.origin, request.origin) && isEqual(r.type, request.requestType))

            //See if rule exists and is expired
            if (rule && rule.expires && rule.expires < Date.now()) {
                //remove expired rule
                remove(rules, rule)
                return false
            }

            return !isNil(rule)
        },
        addRule: (rule: Partial<AutoAllowRule>) => {
            const current = defaultTo(get(rules), [])

            //see if rule aready exists
            if (find(current, r => isEqual(r.origin, rule.origin) && isEqual(r.type, rule.type))) {
                return;
            }
            
            //add rule to head of store
            current.unshift({
                ...rule,
                timestamp: Date.now()
            } as AutoAllowRule)

            set(rules, current)
        },
        deleteRule (rule: AutoAllowRule) {
            //Filter all non matching rules
            const wo = filter(get(rules), r => !(isEqual(r.origin, rule.origin) && isEqual(r.type, rule.type)))
            set(rules, wo)
        },
        getRules:(): AutoAllowRule[] => {
            return trimExpiredRules()
        }
    }
}

const usePermissions = (slot: Ref<PermissionSlot>, rules: ReturnType<typeof useRuleSet>) => {

    const permPopupUrl = runtime.getURL("src/entries/contentScript/auth-popup.html")

    defaults(slot.value, { requests: [] })
    const { requests } = toRefs(slot)

    const activePopups = new Map<number, PermissionRequest>()

    const getRequest = (requestId: string): PermissionRequest | undefined => {
        return find(get(requests), r => r.uuid === requestId)
    }

    const updateRequest = (request: PermissionRequest, addRule: CreateRuleType) => {
        const current = get(requests)

        const index = current.findIndex(r => r.uuid === request.uuid)
        if (index === -1) {
            throw new Error("Request not found")
        }

        //Set request state
        current[index] = request

        //Update storage
        set(requests, current)

        //Add rule if needed
        switch (addRule) {
            case CreateRuleType.AllowOnce:
                //Do nothing
                break;
            //Compute expiration
            default:
                const { expires } = setExpirationRule(addRule);
                rules.addRule({ origin: request.origin, type: request.requestType, expires })
        }
    }

    const initNewRequest = (request: Partial<PermissionRequest>): PermissionRequest => {
        return {
            ...request,
            uuid: nanoid(),
            status: PrStatus.Pending,
            timestamp: Date.now()
        } as PermissionRequest
    }

    const showPermsWindow = async (request: PermissionRequest): Promise<void> => {

        const drawWindow = async ({ uuid }: Partial<PermissionRequest>): Promise<Windows.CreateCreateDataType> => {
            const current = await windows.getCurrent()

            const minWidth = 350
            const minHeight = 180

            const maxWidth = 500
            const maxHeight = 250

            const width = Math.min(Math.max(current.width! - 100, minWidth), maxWidth)
            const height = Math.min(Math.max(current.height! - 100, minHeight), maxHeight)

            //draw half way across screen minus half its width
            const left = current.left! + (current.width! / 2) - (width / 2)

            return {
                url: `${permPopupUrl}?uuid=${uuid}&closeable`,
                type: "popup",
                height: height,
                width: width,
                focused: true,
                allowScriptsToClose: true,
                top: 100,
                //try to center popup
                left: left,
            }
        }

        const windowsArgs = await drawWindow(request)
        const { id } = await windows.create(windowsArgs)
        activePopups.set(id!, request)
    }

    //Listen for popup close to cleanup request
    windows.onRemoved.addListener(async (id) => {
        const req = activePopups.get(id)
        if (req && req.status === PrStatus.Pending) {
            //set denied
            (req as Mutable<PermissionRequest>).status = PrStatus.Denied
            //popup closed, set to denied
            updateRequest(req, CreateRuleType.AllowOnce)
        }
    })

    //Watch for changes to the current tab
    tabs.onRemoved.addListener(async (tabId) => {
        const tab = await tabs.get(tabId)
        const { origin } = new URL(tab.url!)

        //Find ally pending requests for the origin 
        const pending = filter(requests.value, r => r.status == PrStatus.Pending && r.origin == origin)

        //update all pending requests to denied
        forEach(pending, r => updateRequest(r, CreateRuleType.AllowOnce))
    })

    return{
        getRequest,

        pushRequest (request: Partial<PermissionRequest>, showPopup: boolean): PermissionRequest {
            //Create new request
            const req = initNewRequest(request)

            //See if allowed
            if(rules.isAllowed(req)){
                //Set to approved
               (req as Mutable<PermissionRequest>).status = PrStatus.Approved
                //No need to show popup
               showPopup = false
            }

            const current = get(requests)
            current.unshift(req)
            set(requests, current)
            
            //Show popup if needed
            if (showPopup) {
                showPermsWindow(req)
            }
            
            return req
        },

        allow(requestId: string, addRule: CreateRuleType): void {
            const request = getRequest(requestId)
            if(!request){
                throw new Error("Request not found")
            }
            //set approved
            (request as Mutable<PermissionRequest>).status = PrStatus.Approved
            //update request
            updateRequest(request, addRule)
        },

        deny(requestId: string): void {
            const request = getRequest(requestId)
            if (!request) {
                throw new Error("Request not found")
            }
            //set denied
            (request as Mutable<PermissionRequest>).status = PrStatus.Denied
            //update request
            updateRequest(request, CreateRuleType.AllowOnce)
        },

        clearAll: () => {
            //notify pending requests
            forEach(filter(requests.value, r => r.status == PrStatus.Pending), r => {
                //set denied
                (r as Mutable<PermissionRequest>).status = PrStatus.Denied
                //update request
                updateRequest(r, CreateRuleType.AllowOnce)
            })

            //Then defer clear
            defer(() => set(requests, []))
        },
        
        getAll: () => get(requests)
    }
}

export const usePermissionApi = (): IFeatureExport<AppSettings, PermissionApi> => {

    return {
        background: ({ state }: BgRuntime<AppSettings>): PermissionApi => {
            const { loggedIn } = useSession();
            const { currentConfig } = state

            //Open storage slot for permissions
            const reqStore = state.useStorageSlot<PermissionSlot>("permissions", { requests: [] })
            const ruleStore = state.useStorageSlot<RuleSlot>("rules", { rules: [] })

            //init rules api
            const ruleSet = useRuleSet(ruleStore)
            const permissions = usePermissions(reqStore, ruleSet)

            //Computed current time to trigger an update every second
            const currentTime = useTimestamp({ interval: 2000 })

            return {
                waitForChange: waitForChangeFn([currentConfig, loggedIn, reqStore, ruleStore, currentTime]),

                getRequests: () =>  Promise.resolve(permissions.getAll()),

                deny(requestId: string) {
                    permissions.deny(requestId)
                    return Promise.resolve()
                },

                allow(requestId: string, addRule: CreateRuleType) {
                    permissions.allow(requestId, addRule)
                    return Promise.resolve()
                },

                clearRequests: optionsOnly(() => {
                    //clear stored requests
                    permissions.clearAll()
                    return Promise.resolve()
                }),

                async requestAndWaitResult(request: Partial<PermissionRequest>) {
                    
                    debugLog("Requesting permission", request)

                    //push request and show popup only if enabled
                    const req = permissions.pushRequest(request, currentConfig.value.authPopup)

                    //See if pending
                    if(req.status !== PrStatus.Pending){
                        //completed already, return status
                        return req.status
                    }

                    do {

                        //wait for a change
                        await waitOne([ reqStore ])

                        //check if request was approved
                        const status = permissions.getRequest(req.uuid);

                        switch(status?.status){
                            case PrStatus.Approved:
                                return PrStatus.Approved;
                            case PrStatus.Denied:
                                return PrStatus.Denied;
                            case PrStatus.Pending:
                                //continue waiting
                                break;
                            default:
                                throw new Error("Request was rejected or deleted")
                        }

                        //continue to wait for pending status
                    } while(true)
                },

                getRules: () => Promise.resolve(ruleSet.getRules()),

                deleteRule: optionsOnly((rule: AutoAllowRule) => {
                    ruleSet.deleteRule(rule)
                    return Promise.resolve()
                }),

                addRule: optionsOnly((rule: AutoAllowRule) => {
                    ruleSet.addRule(rule)
                    return Promise.resolve()
                }),
            }
        },
        foreground: exportForegroundApi<PermissionApi>([
            'waitForChange',
            'getRequests',
            'clearRequests',
            'requestAndWaitResult',
            'getRules',
            'deleteRule',
            'addRule',
            'allow',
            'deny'
        ]),
    }
}