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

import { runtime } from "webextension-polyfill"
import { isEqual, isNil, isEmpty } from 'lodash'
import { apiCall } from '@vnuge/vnlib.browser'
import { useScriptTag, watchOnce } from "@vueuse/core"
import { useStore } from '../store'
import { storeToRefs } from 'pinia'

const _promptHandler = (() => {
    let _handler = undefined;
    return{
        invoke: (event) => _handler(event),
        set: (handler) => _handler = handler
    }
})()

export const usePrompt = (callback) => _promptHandler.set(callback);


export const onLoad = async () =>{

    const store = useStore()
    const { nostr } = store.plugins
    const { isTabAllowed, selectedKey } = storeToRefs(store)

    const injectHandler = () => {

        //Setup listener for the content script to process nostr messages
        const ext = '@vnuge/nvault-extension'

        const scriptUrl = runtime.getURL('src/entries/nostr-provider.js')

        //setup script tag
        useScriptTag(scriptUrl, undefined, { manual: false, defer: true })

        //Only listen for messages if injection is enabled
        window.addEventListener('message', async ({ source, data, origin }) => {

            const invokePrompt = async (cb) => {
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
            if (!isEqual(data.ext, ext)) {
                return
            }

            //clean any junk/methods with json parse/stringify
            data = JSON.parse(JSON.stringify(data))

            // pass on to background
            var response;
            await apiCall(async () => {
                switch (data.type) {
                    case 'getPublicKey':
                        return invokePrompt(async () => selectedKey.value.PublicKey)
                    case 'signEvent':
                        return invokePrompt(async () => {
                            const event = data.payload.event

                            //Set key id to selected key
                            event.KeyId = selectedKey.value.Id
                            event.pubkey = selectedKey.value.PublicKey;

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
                            KeyId: selectedKey.value.Id
                        }))
                    case 'nip04.decrypt':
                        return invokePrompt(async () => await nostr.nip04Decrypt({
                            pubkey: data.payload.peer,
                            content: data.payload.ciphertext,
                            //Set selected key id as our desired decryption key
                            KeyId: selectedKey.value.Id
                        }))
                    default:
                        throw new Error('Unknown nostr message type')
                }
            })
            // return response message, must have the same id as the request
            window.postMessage({ ext, id: data.id, response }, origin);
        });
    }

    //Make sure the origin is allowed
    if (store.isTabAllowed === false){
        //If not allowed yet, wait for the store to update
        watchOnce(isTabAllowed, val => val ? injectHandler() : undefined);
    }
    else{
        injectHandler();
    }

}