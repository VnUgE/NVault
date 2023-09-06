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
import { sendMessage } from "webext-bridge/content-script"

export const useStatus = (() => {
    const status = _sts(sendMessage, false);
    
    return () => {
        const refs = status.toRefs();
        //run status when called and dont await
        status.update();
        return refs;
    }
})()

export const useManagment = (() => {
    const mgmt = _mgmt(sendMessage);
    
    const isEnabledSite = async () => {
        await apiCall(async ({ toaster }) => {

            //Send the login request to the background script
            const data = await sendMessage('isSiteEnabled', { }, 'background')
        })
    }

    return () => {
        return {
            ...mgmt,
        }
    }
})()
