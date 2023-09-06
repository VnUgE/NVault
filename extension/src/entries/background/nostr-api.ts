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

import { useSettings } from "./settings";
import { useAuthApi } from "./auth-api";
import { computed, ref, watch } from "vue";

import { find, isArray } from "lodash";
import { BridgeMessage } from "webext-bridge";
import { NostrRelay, NostrPubKey, EventMessage, NostrEvent } from './types'
import { Endpoints, initApi } from "./server-api";

export const useNostrApi = (() => {

    const { currentConfig } = useSettings();
    const { apiCall, protect, loggedIn } = useAuthApi();

    const nostrUrl = computed(() => currentConfig.value.nostrEndpoint || '/nostr')

    //Init the api endpooints
    const { execRequest } = initApi(nostrUrl);

    //Get the current selected key
    const selectedKey = ref<NostrPubKey | null>({} as NostrPubKey)

    const onGetPubKey = () => {
        //Selected key is allowed from content script
        return { ...selectedKey.value }
    }

    const onDeleteKey = protect<NostrPubKey>(({ data }) => apiCall(() => execRequest<NostrPubKey>(Endpoints.DeleteKey, data)))

    const onSelectKey = protect<NostrPubKey>(async ({ data }) => {
        //Set the selected key to the value
        selectedKey.value = data
    })

    const onGetAllKeys = protect(async () => {
        return await apiCall(async () => {

            //Get the keys from the server
            const data = await execRequest<NostrPubKey[]>(Endpoints.GetKeys);

            //Response must be an array of key objects
            if (!isArray(data)) {
                return [];
            }

            //Make sure the selected keyid is in the list, otherwise unselect the key
            if (data?.length > 0) {
                if (!find(data, k => k.Id === selectedKey.value?.Id)) {
                    selectedKey.value = null;
                }
            }

            return [ ...data ]
        })
    })

    //Unprotect this handler so it can be called from the content script
    const onSignEvent = (async ({ data }: BridgeMessage<EventMessage>) => {
        //Set the key id from our current selection
        data.event.KeyId = selectedKey.value?.Id || ''; //Pass key selection error to server

        //Sign the event
        return await apiCall(async () => {
            //Sign the event
            const event = await execRequest<NostrEvent>(Endpoints.SignEvent, data.event);
            return { event };
        })
    })

    const onGetRelays = async () => {
        return await apiCall(async () => {
            //Get preferred relays for the current user
            const data = await execRequest<NostrRelay[]>(Endpoints.GetRelays)
            return [ ...data ]
        })
    }


    const onSetRelay = protect<NostrRelay>(({ data }) => apiCall(() => execRequest<NostrRelay>(Endpoints.SetRelay, data)));

    const onNip04Encrypt = protect(async ({ data }) => {
        console.log('nip04.encrypt', data)
        return { ciphertext: 'ciphertext' }
    })

    const onNip04Decrypt = protect(async ({ data }) => {
        console.log('nip04.decrypt', data)
        return { plaintext: 'plaintext' }
    })

    //Clear the selected key if the user logs out
    watch(loggedIn, (li) => li ? null : selectedKey.value = null)

    return () => {
        return{
            selectedKey,
            nostrUrl,
            onGetPubKey,
            onSelectKey,
            onGetAllKeys,
            onSignEvent,
            onGetRelays,
            onSetRelay,
            onNip04Encrypt,
            onNip04Decrypt,
            onDeleteKey
        }
    }
})()