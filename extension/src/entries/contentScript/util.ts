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

import { isEqual, isNil, isEmpty } from 'lodash'
import { apiCall } from '@vnuge/vnlib.browser'
import { Store, storeToRefs } from 'pinia'
import { useScriptTag, watchOnce } from "@vueuse/core"
import { useStore } from '../store'
import { PrStatus } from '../../features'

const registerWindowHandler = (store: Store, extName: string) => {

    const { selectedKey } = storeToRefs(store)
    const { nostr, permission } = store.plugins;

    const onAsyncCall = async ({ source, data, origin } : MessageEvent<any>) => {

        //clean any junk/methods with json parse/stringify
        data = JSON.parse(JSON.stringify(data))

        const requestPermission = async (cb: (...args: any) => Promise<any>) => {
            //await propmt for user to allow the request
            const allow = await permission.requestAndWaitResult({ ...data, requestType: data.type, origin })
            //send request to background
            return allow == PrStatus.Approved ? await cb() : { error: 'User denied permission' }
        }

        //Confirm the message format is correct
        if (!isEqual(source, window) || isEmpty(data) || isNil(data.type)) {
            return
        }
        //Confirm extension is for us
        if (!isEqual(data.ext, extName)) {
            return
        }

        switch (data.type) {
            case 'getPublicKey':
                return requestPermission(async () => selectedKey.value?.PublicKey);
            case 'signEvent':
                return requestPermission(async () => {
                    const event = data.payload.event
                    return await nostr.signEvent({
                        ...event,
                        KeyId: selectedKey.value!.Id,
                        pubkey: selectedKey.value!.PublicKey
                    });
                })
            //Check the public key against selected key
            case 'getRelays':
                return requestPermission(async () => await nostr.getRelays())
            case 'nip04.encrypt':
                return requestPermission(async () => {
                    return await nostr.nip04Encrypt({
                        pubkey: data.payload.peer,
                        content: data.payload.plaintext,
                        //Set selected key id as our desired encryption key
                        KeyId: selectedKey.value!.Id
                    })
                })
            case 'nip04.decrypt':
                return requestPermission(async () => {
                    const result = await apiCall(async () => {
                        return await nostr.nip04Decrypt({
                            pubkey: data.payload.peer,
                            content: data.payload.ciphertext,
                            //Set selected key id as our desired decryption key
                            KeyId: selectedKey.value!.Id
                        })
                    })
                    return isNil(result) ? 'Error: Failed to decrypt message' : result
                })
        }
    }

    //Only listen for messages if injection is enabled
    window.addEventListener('message', async (args) => {

        //Wrap in apicall to display errors
        await apiCall(async () => {
            let response; 

            try{
                response = await onAsyncCall(args)
            }
            catch(e: any){
                const error = JSON.stringify(e)
                response = { error }
                //rethrow for logging
                throw e;
            }
            finally{
                // always return response message, must have the same id as the request
                window.postMessage({ ext: extName, id: args.data.id, response }, origin);
            }
        })
    });
}

export const onLoad = (extName: string, scriptUrl: string) => {
   
    const store = useStore()
    const { isTabAllowed } = storeToRefs(store)

    const injectHandler = () => {
        //inject the nostr provider script into the page
        useScriptTag(scriptUrl, undefined, { manual: false, defer: true })
        //Regsiter listener for messages from the injected script
        registerWindowHandler(store, extName)
    }

    //Make sure the origin is allowed
    if (isTabAllowed.value === false) {
        //If not allowed yet, wait for the store to update
        watchOnce(isTabAllowed, val => val ? injectHandler() : undefined);
    }
    else {
        injectHandler();
    }
}