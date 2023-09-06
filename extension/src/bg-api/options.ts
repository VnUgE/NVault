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


import { apiCall } from "@vnuge/vnlib.browser";
import { useManagment as _mgmt, useStatus as _sts } from "./bg-api"
import { sendMessage } from "webext-bridge/options"
import { truncate } from "lodash";
import { NostrIdentiy, PluginConfig } from "./types";

enum HistoryType {
    get = 'get',
    clear = 'clear',
    remove = 'remove',
    push = 'push'
}

interface HistoryMessage{
    readonly action: string,
    readonly event?: any
}

export const useManagment = (() => {
    const mgmt = _mgmt(sendMessage);    

    const saveSiteConfig = async (config: PluginConfig) => {
        await apiCall(async ({ toaster }) => {
            //Send the login request to the background script
            await sendMessage('setSiteConfig', { ...config }, 'background')

            toaster.form.info({
                title: 'Saved',
                text: 'Site config saved'
            })
        })
    }

    const deleteIdentity = async (key: NostrIdentiy) => {
        await apiCall(async ({ toaster }) => {
            //Delete the desired key async, if it fails it will throw
            await sendMessage('deleteKey', { ...key }, 'background')

            toaster.form.success({
                title: 'Success',
                text: `Successfully delete key ${truncate(key.Id, { length: 7 })}`
            })
        })
    }

    return () => {
        return {
            ...mgmt,
            saveSiteConfig,
            deleteIdentity
        }
    }
})()

export const useStatus = (() => {
    //Bypass the window focus check for the options page
    const status = _sts(sendMessage, true);
    return () => {
        const refs = status.toRefs();
        //run status when called and dont await
        status.update();
        return refs;
    }
})()
