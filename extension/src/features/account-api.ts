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

import { useMfaConfig, usePkiConfig, PkiPublicKey, debugLog } from "@vnuge/vnlib.browser";
import { ArrayToHexString, Base64ToUint8Array } from "@vnuge/vnlib.browser/dist/binhelpers";
import { JsonObject } from "type-fest";
import { useSingleSlotStorage } from "./types";
import { computed, watch } from "vue";
import { storage } from "webextension-polyfill";
import { JWK, SignJWT, importJWK } from "jose";
import { cloneDeep } from "lodash";
import { FeatureApi, BgRuntime, IFeatureExport, exportForegroundApi, optionsOnly, popupAndOptionsOnly } from "./framework";
import { AppSettings } from "./settings";


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

export interface PkiApi extends FeatureApi{
    getAllKeys(): Promise<PkiPubKey[]>
    removeKey(kid: PkiPubKey): Promise<void>
    isEnabled(): Promise<boolean>
}

export const usePkiApi = (): IFeatureExport<AppSettings, PkiApi> => {
    return{
        background: ({ state } : BgRuntime<AppSettings>):PkiApi =>{
            const accountPath = computed(() => state.currentConfig.value.accountBasePath)
            const mfaEndpoint = computed(() => `${accountPath.value}/mfa`)
            const pkiEndpoint = computed(() => `${accountPath.value}/pki`)

            //Compute config
            const mfaConfig = useMfaConfig(mfaEndpoint);
            const pkiConfig = usePkiConfig(pkiEndpoint, mfaConfig);

            //Refresh the config when the endpoint changes
            watch(mfaEndpoint, () => pkiConfig.refresh());

            return{
                getAllKeys: optionsOnly(async () => {
                    const res = await pkiConfig.getAllKeys();
                    return res as PkiPubKey[]
                }),
                removeKey: optionsOnly(async (key: PkiPubKey) => {
                    await pkiConfig.removeKey(key.kid)
                }),
                isEnabled: popupAndOptionsOnly(async () => {
                    return pkiConfig.enabled.value
                })
            }
        },
        foreground: exportForegroundApi<PkiApi>([
            'getAllKeys',
            'removeKey',
            'isEnabled'
        ])
    }
}

interface PkiSettings {
    userName: string,
    privateKey?:JWK
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
            const { get, set } = useSingleSlotStorage<PkiSettings>(storage.local, 'pki-settings')

            const getPubKey = async (): Promise<PkiPubKey | undefined> => {
                const setting = await get()

                if (!setting?.privateKey) {
                    return undefined
                }

                //Clone the private key, remove the private parts
                const c = cloneDeep(setting.privateKey)

                delete c.d
                delete c.p
                delete c.q
                delete c.dp
                delete c.dq
                delete c.qi

                return {
                    ...c,
                    userName: setting.userName
                } as PkiPubKey
            }

            return{
                regenerateKey: optionsOnly(async (userName:string, params:EcKeyParams) => {
                    const p = {
                        ...params,
                        name: "ECDSA",
                    }

                    //Generate a new key
                    const key = await window.crypto.subtle.generateKey(p, true, ['sign', 'verify'])

                    //Convert to jwk
                    const privateKey = await window.crypto.subtle.exportKey('jwk', key.privateKey) as JWK;

                    //Convert to base64 so we can hash it easier
                    const b = btoa(privateKey.x! + privateKey.y!);

                    //take sha256 of the binary version of the coords
                    const digest = await crypto.subtle.digest('SHA-256', Base64ToUint8Array(b));

                    //Set the kid
                    privateKey.kid = ArrayToHexString(digest);

                    //Serial number is random hex
                    const serial = new Uint8Array(32)
                    crypto.getRandomValues(serial)
                    privateKey.serial = ArrayToHexString(serial);

                    //Save the key
                    await set({ userName, privateKey })
                }),
                getPubKey: optionsOnly(getPubKey),
                generateOtp: optionsOnly(async () =>{
                    const setting = await get()
                    if (!setting?.privateKey) {
                        throw new Error('No key found')
                    }

                    const privKey = await importJWK(setting.privateKey as JWK)

                    const random = new Uint8Array(32)
                    crypto.getRandomValues(random)

                    const jwt = new SignJWT({
                        'sub': setting.userName,
                        'n': ArrayToHexString(random),
                        keyid: setting.privateKey.kid,
                        serial: privKey.serial
                    });

                    const token = await jwt.setIssuedAt()
                        .setProtectedHeader({ alg: setting.privateKey.alg! })
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
