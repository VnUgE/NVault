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

import { isEqual, isNil, isEmpty } from 'lodash'
import { apiCall } from '@vnuge/vnlib.browser'
import { Store, storeToRefs } from 'pinia'
import { useScriptTag, watchOnce } from "@vueuse/core"
import { useStore } from '../store'

export type PromptHandler = (request: UserPermissionRequest) => Promise<boolean>

export interface UserPermissionRequest {
    type: string
    msg: string
    origin: string
    data: any
}

const _promptHandler = (() => {
    let _handler: PromptHandler | undefined = undefined;
    return {
        invoke(event:UserPermissionRequest){
            if (!_handler) {
                throw new Error('No prompt handler set')
            }
            return _handler(event)
        },
        set(handler: PromptHandler) { 
            _handler = handler
        }
    }
})()


const registerWindowHandler = (store: Store, extName: string) => {

    const { selectedKey } = storeToRefs(store)
    const { nostr } = store.plugins;

    //Only listen for messages if injection is enabled
    window.addEventListener('message', async ({ source, data, origin }) => {

        //clean any junk/methods with json parse/stringify
        data = JSON.parse(JSON.stringify(data))

        const invokePrompt = async (cb:(...args:any) => Promise<any>) => {
            //await propmt for user to allow the request
            const allow = await _promptHandler.invoke({ ...data, origin })
            //send request to background
            return response = allow ? await cb() : { error: 'User denied permission' }
        }

        //Confirm the message format is correct
        if (!isEqual(source, window) || isEmpty(data) || isNil(data.type)) {
            return
        }
        //Confirm extension is for us
        if (!isEqual(data.ext, extName)) {
            return
        }

        // pass on to background
        var response;
        await apiCall(async () => {
            switch (data.type) {
                case 'getPublicKey':
                    return invokePrompt(async () => selectedKey.value?.PublicKey)
                case 'signEvent':
                    return invokePrompt(async () => {
                        const event = data.payload.event

                        //Set key id to selected key
                        event.KeyId = selectedKey.value!.Id
                        event.pubkey = selectedKey.value!.PublicKey;

                        return await nostr.signEvent(event);
                    })
                //Check the public key against selected key
                case 'getRelays':
                    return invokePrompt(async () => await nostr.getRelays())
                case 'nip04.encrypt':
                    return invokePrompt(async () => await nostr.nip04Encrypt({
                        pubkey: data.payload.peer,
                        content: data.payload.plaintext,
                        //Set selected key id as our desired decryption key
                        KeyId: selectedKey.value!.Id
                    }))
                case 'nip04.decrypt':
                    return invokePrompt(async () => await nostr.nip04Decrypt({
                        pubkey: data.payload.peer,
                        content: data.payload.ciphertext,
                        //Set selected key id as our desired decryption key
                        KeyId: selectedKey.value!.Id
                    }))
                default:
                    throw new Error('Unknown nostr message type')
            }
        })
        // return response message, must have the same id as the request
        window.postMessage({ ext: extName, id: data.id, response }, origin);
    });
}

export const usePrompt = (callback: PromptHandler) => _promptHandler.set(callback);

export const onLoad = async (extName: string, scriptUrl: string) => {
   
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