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
import { createPort } from '../../webext-bridge/'
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

    const injectHandler = () => {

        //Setup listener for the content script to process nostr messages
        const ext = '@vnuge/nvault-extension'
        const { sendMessage } = createPort('content-script')

        const scriptUrl = runtime.getURL('src/entries/nostr-provider.js')

        //setup script tag
        useScriptTag(scriptUrl, undefined, { manual: false, defer: true })

        //Only listen for messages if injection is enabled
        window.addEventListener('message', async ({ source, data, origin }) => {
            //Confirm the message format is correct
            if (!isEqual(source, window) || isEmpty(data) || isNil(data.type)) {
                return
            }
            //Confirm extension is for us
            if (!isEqual(data.ext, ext)) {
                return
            }

            // pass on to background
            var response;
            await apiCall(async () => {
                switch (data.type) {
                    case 'getPublicKey':
                    case 'signEvent':
                    //Check the public key against selected key
                    case 'getRelays':
                    case 'nip04.encrypt':
                    case 'nip04.decrypt':
                        //await propmt for user to allow the request
                        const allow = await _promptHandler.invoke({ ...data, origin })
                        //send request to background
                        response = allow ? await sendMessage(data.type, { ...data.payload, origin }, 'background') : { error: 'User denied permission' }
                        break;
                    default:
                        throw new Error('Unknown nostr message type')
                }
            })
            // return response message, must have the same id as the request
            window.postMessage({ ext, id: data.id, response }, origin);
        });
    }

    const store = useStore()
    const { isTabAllowed } = storeToRefs(store)
    
    //Make sure the origin is allowed
    if (store.isTabAllowed === false){
        //If not allowed yet, wait for the store to update
        watchOnce(isTabAllowed, val => val ? injectHandler() : undefined);
        return;
    }
    else{
        injectHandler();
    }

}