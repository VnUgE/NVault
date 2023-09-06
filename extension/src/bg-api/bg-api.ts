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


import { assign, isEqual, orderBy, transform } from 'lodash'
import { apiCall, debugLog } from "@vnuge/vnlib.browser"
import { reactive, toRefs } from "vue"
import { useWindowFocus } from '@vueuse/core'
import { NostrPubKey } from '../entries/background/types'
import { ClientStatus, NostrIdentiy, SendMessageHandler, UseStatusResult, PluginConfig } from './types'


//Hold local status
const status = reactive<ClientStatus>({
    loggedIn: false,
    userName: '',
    selectedKey: undefined,
    darkMode: true
})

const focused = useWindowFocus()

const updateStatusAsync = async (sendMessage: SendMessageHandler) => {

    //Get the status from the background script
    const result = await sendMessage<ClientStatus>('getStatus', {}, 'background')

    const ls = status as any;
    const res = result as any;

    //Check if the status has changed
    for (const key in result) {
        if (!isEqual(ls[key], res)){
            //Update the status and break
            assign(status, result)
            break;
        }
    }

    //Get the selected publicKey
    const selected = await sendMessage<NostrPubKey>('getPublicKey', {}, 'background')

    if(!isEqual(status.selectedKey, selected)){
        debugLog('Selected key changed')
        assign(status, { selectedKey: selected })
    }
}

/**
 * Keeps a reactive status object that up to date with the background script
 * @returns {Readonly<Ref<{}>>}
 */
export const useStatus = (sendMessage: SendMessageHandler, bypassFocus : boolean): UseStatusResult => {
    //Configure timer get status from the background, only when the window is focused
    setInterval(() => (bypassFocus || focused.value) ? updateStatusAsync(sendMessage) : null, 200);

    //return a refs object
    return {
        toRefs: () => toRefs(status),
        update: () => updateStatusAsync(sendMessage)
    }
}

export const useManagment = (sendMessage: SendMessageHandler) =>{


    const getProfile = async () => {
        //Send the login request to the background script
        return await apiCall(async () => await sendMessage('getProfile', {}, 'background'))
    }

    const getAllKeys = async (): Promise<NostrPubKey[]> => {
        //Send the login request to the background script
        const keys = (await apiCall(async () => await sendMessage('getAllKeys', {}, 'background')) ?? []) as NostrPubKey[]
       
        const formattedKeys = transform(keys, (result,  key) => {
           result.push({
                ...key,
                Created: new Date(key.Created).toLocaleString(),
                LastModified: new Date(key.LastModified).toLocaleString()
           })
        }, [] as NostrPubKey[])

        return orderBy(formattedKeys, 'Created', 'desc')
    }

    const selectKey = async (key: NostrPubKey) => {
        await apiCall(async () => {
            //Send the login request to the background script
            await sendMessage('selectKey', { ...key }, 'background')
        })
        //Update the status after the key is selected
        updateStatusAsync(sendMessage)
    }

    const createIdentity = async (identity: NostrIdentiy) => {
        await apiCall(async ({toaster}) => {
            //Send the login request to the background script
            await sendMessage('createIdentity', { ...identity }, 'background')
            toaster.form.success({
                title: 'Success',
                text: 'Identity created successfully'
            })
        })
    }

    const updateIdentity = async (identity: NostrIdentiy) => {
        await apiCall(async ({toaster}) => {
            //Send the login request to the background script
            await sendMessage('updateIdentity', { ...identity }, 'background')
            toaster.form.success({
                title: 'Success',
                text: 'Identity updated successfully'
            })
        })
    }

    const getSiteConfig = async (): Promise<PluginConfig | undefined> => {
        return await apiCall(async () => {
            //Send the login request to the background script
            return await sendMessage<PluginConfig>('getSiteConfig', {}, 'background')
        })
    }

    return {
        getProfile,
        getAllKeys,
        selectKey,
        createIdentity,
        updateIdentity,
        getSiteConfig
    }
}