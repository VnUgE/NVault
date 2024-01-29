
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

import { runtime } from "webextension-polyfill";
import { serializeError, deserializeError } from 'serialize-error';
import { JsonObject } from "type-fest";
import { cloneDeep, isArray, isObjectLike, set } from "lodash";
import { debugLog } from "@vnuge/vnlib.browser";
import { ChannelContext, createMessageChannel } from "../../messaging";

export interface BgRuntime<T> {
    readonly state: T;
    onInstalled(callback: () => Promise<void>): void;
    onConnected(callback: () => Promise<void>): void;
    openBackChannel<T extends FeatureApi>(name: string, callback: (feature: T | undefined) => void): void;
}

export type FeatureApi = {
    [key: string]: (... args: any[]) => Promise<any>
};

export type SendMessageHandler = <T extends JsonObject | JsonObject[]>(action: string, data: any) => Promise<T>
export type VarArgsFunction<T> = (...args: any[]) => T
export type FeatureConstructor<TState, T extends FeatureApi> = () => IFeatureExport<TState, T>

export type DummyApiExport<T extends FeatureApi> = {
    [K in keyof T]: T[K] extends Function ? K : never
}[keyof T][]


export interface IFeatureExport<TState, TFeature extends FeatureApi> {
    /**
     * Initializes a feature for mapping in the background runtime context
     * @param bgRuntime The background runtime context 
     * @returns The feature's background api handlers that maps to the foreground
     */
    background(bgRuntime: BgRuntime<TState>): TFeature
    /**
     * Initializes the feature for mapping in any foreground runtime context
     * @returns The feature's foreground api stub methods for mapping. They must 
     * match the background api
     */
    foreground(): TFeature
}

export interface IForegroundUnwrapper {
    /**
     * Unwraps a foreground feature and builds it's method bindings to 
     * the background handler
     * @param feature The foreground feature that will be mapped to it's
     *  background handlers
     * @returns The foreground feature's api stub methods
     */
    use: <T extends FeatureApi>(feature: FeatureConstructor<any, T>) => T
}

export interface IBackgroundWrapper<TState> {
    register<T extends FeatureApi>(features: FeatureConstructor<TState, T>[]): void
}

export interface ProtectedFunction extends Function {
    readonly protection: ChannelContext[]
}

export const optionsOnly = <T extends Function>(func: T): T => protectMethod(func, 'options');
export const popupOnly = <T extends Function>(func: T): T => protectMethod(func, 'popup');
export const contentScriptOnly = <T extends Function>(func: T): T => protectMethod(func, 'content-script');
export const popupAndOptionsOnly = <T extends Function>(func: T): T => protectMethod(func, 'popup', 'options');

export const protectMethod = <T extends Function>(func: T, ...protection: ChannelContext[]): T => {
    (func as any).protection = protection
    return func;
}

type BgCallback = (feature: FeatureApi | undefined) => void

/**
 * Creates a background runtime context for registering background 
 * script feature api handlers 
 */
export const useBackgroundFeatures = <TState>(state: TState): IBackgroundWrapper<TState> => {
    
    const { openOnMessageChannel } = createMessageChannel('background');
    const { onMessage } = openOnMessageChannel()
   
    const backChannels = new Map<string, BgCallback>()

    const openBackChannel = async (name: string, callback: BgCallback) => {
        backChannels.set(name, callback)
    }

    const notifyBackChannels = (pool: Map<string, FeatureApi>) => {
        //Loop through all features
        for (const [name, waiter] of backChannels.entries()){
            //Notify the waiter of the feature
            waiter(pool.get(name))
        }
    }

    const rt = {
        state,
        onConnected: runtime.onConnect.addListener,
        onInstalled: runtime.onInstalled.addListener,
        openBackChannel
    }   as BgRuntime<TState>

    /**
     * Each plugin will export named methods. Background methods
     * are captured and registered as on-message handlers that 
     * correspond to the method name. Foreground method calls 
     * are redirected to the send-message of the same unique name
     */

    return{
        register: <TFeature extends FeatureApi>(features: FeatureConstructor<TState, TFeature>[]) => {
            
            const featurePool = new Map<string, FeatureApi>()

            //Loop through features
            for (const feature of features) {

                //Init feature
                const f = feature().background(rt)

                //Add to pool
                featurePool.set(feature.name, f)

                //Get all exported function
                for (const externFuncName in f) {

                    //get exported function
                    const func = f[externFuncName] as Function

                    const onMessageFuncName = `${feature.name}-${externFuncName}`

                    //register method with api
                    onMessage<any>(onMessageFuncName, async (sender, payload) => {
                        try {

                            if ((func as ProtectedFunction).protection
                                && !(func as ProtectedFunction).protection.includes(sender)) {
                                throw new Error(`Unauthorized external call to ${onMessageFuncName}`)
                            }

                            const res = await func(...payload)
                            
                            if(isArray(res)){
                                return [...res]
                            }
                            else if(isObjectLike(res)){
                                return { ...res }
                            }
                            else{
                                return res
                            }
                        }
                        catch (e: any) {
                            debugLog(`Error in method ${onMessageFuncName}`, e)
                            const s = serializeError(e)
                            return {
                                bridgeMessageException: JSON.stringify(s),
                                axiosResponseError: JSON.stringify(e.response)
                            }
                        }
                    });
                }
            }

            //Notify all back channels that the load is complete
            notifyBackChannels(featurePool)
        }
    }
}

/**
 * Creates a foreground runtime context for unwrapping foreground stub 
 * methods and redirecting them to thier background handler
 */
export const useForegoundFeatures = (context: ChannelContext): IForegroundUnwrapper => {
    
    const { openChannel } = createMessageChannel(context);
    const { sendMessage } = openChannel()

    /**
     * The goal of this function is to get the foreground interface object
     * that should match the background implementation. All methods are
     * intercepted and redirected to the background via send-message
     */

    return{
        use: <T extends FeatureApi>(feature:FeatureConstructor<any, T>): T => {
            //Register the feature
            const api = feature().foreground()
            const featureName = feature.name
            const proxied : T = {} as T

            //Loop through all methods
            for(const funcName in api){
                
                //Create proxy for each method
                set(proxied, funcName, async (...args:any) => {
                    
                    //Check for exceptions
                    const result = await sendMessage(`${featureName}-${funcName}`, cloneDeep(args)) as any

                    if(result?.bridgeMessageException){
                        const str = JSON.parse(result.bridgeMessageException)
                        const err = deserializeError(str)
                        //Recover axios response
                        if(result.axiosResponseError){
                            (err as any).response = JSON.parse(result.axiosResponseError)
                        }

                        throw err;
                    }
                    
                    return result;
                })
            }

            return proxied;
        }
    }
}

export const exportForegroundApi = <T extends FeatureApi>(args: DummyApiExport<T>): () => T => {
    //Create the type from the array of type properties
    const type = {} as T

    //Loop through all properties
    for(const prop of args){
        //Default the property to an implementation error
        type[prop] = (async () => {
            throw new Error(`Method ${prop.toString()} not implemented`)
        }) as any 
    }

    return () => type
}
