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

import { usePkiConfig, type PkiPublicKey, useSession } from "@vnuge/vnlib.browser";
import { ArrayToHexString, Base64ToUint8Array } from "@vnuge/vnlib.browser/dist/binhelpers";
import { JsonObject } from "type-fest";
import { computed, shallowRef } from "vue";
import { JWK, SignJWT, importJWK } from "jose";
import { clone } from "lodash";
import { FeatureApi, BgRuntime, IFeatureExport, exportForegroundApi, optionsOnly } from "./framework";
import { AppSettings } from "./settings";
import { get, set, toRefs, useToggle, watchDebounced } from "@vueuse/core";
import { Watchable } from "./types";
import { waitForChangeFn } from "./util";


export interface EcKeyParams extends JsonObject {
    readonly namedCurve: string
}

export interface PkiPubKey extends JsonObject, PkiPublicKey {
    readonly kid: string,
    readonly alg: string,
    readonly use: string,
    readonly kty: string,
    readonly x: string,
    readonly y: string,
    readonly serial: string
    readonly userName: string
}

export interface PkiApi extends FeatureApi, Watchable{
    getAllKeys(): Promise<PkiPubKey[]>
    addOrUpdate(key: PkiPubKey): Promise<void>
    removeKey(kid: PkiPubKey): Promise<void>
    refresh(): Promise<void>
}

export const usePkiApi = (): IFeatureExport<AppSettings, PkiApi> => {
    return{
        background: ({ state } : BgRuntime<AppSettings>):PkiApi =>{
            const { loggedIn } = useSession()
            const accountPath = computed(() => state.currentConfig.value.accountBasePath)
            const pkiEndpoint = computed(() => `${accountPath.value}/pki`)
            const [ onRefresh, refresh ] = useToggle()
            //Compute config
          
            const pkiConfig = usePkiConfig(pkiEndpoint);
            const keys = shallowRef<PkiPubKey[]>([])

            //Refresh the config when the endpoint changes
            watchDebounced([pkiEndpoint, loggedIn, onRefresh], async () => {
                if(!loggedIn.value){
                    set(keys, [])
                    return
                }

                const res = await pkiConfig.getAllKeys()
                set(keys, res as PkiPubKey[])
            }, {debounce: 100});

            return{
                waitForChange: waitForChangeFn([loggedIn, keys]),
                getAllKeys: optionsOnly(() => {
                    return Promise.resolve(get(keys))
                }),
                removeKey: optionsOnly(async (key: PkiPubKey) => {
                    await pkiConfig.removeKey(key.kid)
                }),
                addOrUpdate: optionsOnly(async (key: PkiPubKey) => {
                    await pkiConfig.addOrUpdate(key)
                }),
                refresh() {
                    refresh()
                    return Promise.resolve()
                }
            }
        },
        foreground: exportForegroundApi<PkiApi>([
            'waitForChange',
            'getAllKeys',
            'addOrUpdate',
            'removeKey',
            'refresh'
        ])
    }
}

interface PkiSettings {
    userName: string,
    privateKey:JWK | undefined
}

export interface LocalPkiApi extends FeatureApi {
    regenerateKey: (userName:string, params: EcKeyParams) => Promise<void>
    getPubKey: () => Promise<PkiPubKey | undefined>
    generateOtp: () => Promise<string>
}

export const useLocalPki = (): IFeatureExport<AppSettings, LocalPkiApi> => {

    return{
        //Setup registration
        background: ({ state } : BgRuntime<AppSettings>) =>{
            const store = state.useStorageSlot<PkiSettings>('pki-settings', { userName: '', privateKey: undefined })
            const { userName, privateKey } = toRefs(store)

            const getPubKey = async (): Promise<PkiPubKey | undefined> => {

                if (!privateKey.value) {
                    return undefined
                }

                //Clone the private key, remove the private parts
                const c = clone(privateKey.value)

                delete c.d
                delete c.p
                delete c.q
                delete c.dp
                delete c.dq
                delete c.qi

                return {
                    ...c,
                    userName: userName.value
                } as PkiPubKey
            }

            return{
                regenerateKey: optionsOnly(async (uname:string, params:EcKeyParams) => {
                    const p = {
                        ...params,
                        name: "ECDSA",
                    }

                    //Generate a new key
                    const key = await window.crypto.subtle.generateKey(p, true, ['sign', 'verify'])

                    //Convert to jwk
                    const newKey = await window.crypto.subtle.exportKey('jwk', key.privateKey) as JWK;

                    //Convert to base64 so we can hash it easier
                    const b = btoa(newKey.x! + newKey.y!);

                    //take sha256 of the binary version of the coords
                    const digest = await crypto.subtle.digest('SHA-256', Base64ToUint8Array(b));

                    //Set the kid
                    newKey.kid = ArrayToHexString(digest);

                    //Serial number is random hex
                    const serial = new Uint8Array(32)
                    crypto.getRandomValues(serial)
                    newKey.serial = ArrayToHexString(serial);

                    //Set the username
                    set(userName, uname)
                    set(privateKey, newKey)
                }),
                getPubKey: optionsOnly(getPubKey),
                generateOtp: optionsOnly(async () =>{
                   
                    if (!privateKey.value) {
                        throw new Error('No key found')
                    }

                    const privKey = await importJWK(privateKey.value as JWK)

                    const random = new Uint8Array(32)
                    crypto.getRandomValues(random)

                    const jwt = new SignJWT({
                        'sub': userName.value,
                        'n': ArrayToHexString(random),
                        keyid: privateKey.value.kid,
                        serial: (privKey as any).serial
                    });

                    const token = await jwt.setIssuedAt()
                        .setProtectedHeader({ alg: privateKey.value.alg! })
                        .setIssuer(state.currentConfig.value.apiUrl)
                        .setExpirationTime('30s')
                        .sign(privKey)

                    return token
                })
            }  
        },
        foreground: exportForegroundApi<LocalPkiApi>([
            'regenerateKey',
            'getPubKey',
            'generateOtp'
        ])
    }
}
