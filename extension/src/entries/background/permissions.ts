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

import { useStorageAsync } from "@vueuse/core";
import { find, isEmpty, remove } from "lodash";
import { storage } from "webextension-polyfill";
import { useAuthApi } from "./auth-api";
import { useSettings } from "./settings";

const permissions = useStorageAsync("permissions", [], storage.local);

export const setAutoAllow = async (origin, mKind, keyId) => {
    permissions.value.push({ origin, mKind, keyId, })
}

/**
 * Determines if the user has previously allowed the origin to use the key to sign events 
 * of the desired kind
 * @param {*} origin The site origin requesting the permission
 * @param {*} mKind The kind of message being signed
 * @param {*} keyId The keyId of the key being used to sign the message
 */
export const isAutoAllow = async (origin, mKind, keyId) => {
    return find(permissions.value, p => p.origin === origin && p.mKind === mKind && p.keyId === keyId) !== undefined
}

/**
 * Removes the auto allow permission from the list
 * @param {*} origin The site origin requesting the permission
 * @param {*} mKind The message kind being signed
 * @param {*} keyId The keyId of the key being used to sign the message
 */
export const removeAutoAllow = async (origin, mKind, keyId) => {
    //Remove the permission from the list
    remove(permissions.value, p => p.origin === origin && p.mKind === mKind && p.keyId === keyId);
}


export const useSitePermissions = (() => {

    const { apiCall, protect } = useAuthApi();
    const { currentConfig } = useSettings();
    

    const getCurrentPerms = async () => {
        const { permissions } = await storage.local.get('permissions');

        //Store a default config if none exists
        if (isEmpty(permissions)) {
            await storage.local.set({ siteConfig: defaultConfig });
        }

        //Merge the default config with the site config
        return merge(defaultConfig, siteConfig)
    }

    const onIsSiteEnabled = protect(async ({ data }) => {

    })

    return () => {
        return {
            onCreateIdentity,
            onUpdateIdentity
        }
    }

})()