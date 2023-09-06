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

import { debugLog, useAxios, usePkiAuth, useSession, useSessionUtils, useUser } from "@vnuge/vnlib.browser";
import { AxiosInstance } from "axios";
import { runtime } from "webextension-polyfill";
import { BridgeMessage  } from "webext-bridge";
import { useSettings } from "./settings";
import { JsonObject } from "type-fest";
import { ClientStatus, LoginMessage } from "./types";

interface ApiHandle {
    axios: AxiosInstance
}

export interface ProectedHandler<T extends JsonObject> {
    (message: BridgeMessage<T>): Promise<any>
}

export const useAuthApi = (() => {

    const { loggedIn } = useSession();
    const { clearLoginState } = useSessionUtils();
    const { logout, getProfile, heartbeat, userName } = useUser();
    const { currentConfig } = useSettings();
    
    const apiCall = async <T>(asyncFunc: (h: ApiHandle) => Promise<T>): Promise<T> => {
        try {
            //Get configured axios instance from vnlib
            const axios = useAxios(null);

            //Exec the async function
            return await asyncFunc({ axios })
        } catch (errMsg) {
            debugLog(errMsg)
            // See if the error has an axios response
            throw { ...errMsg };
        }
    }
 
    const protect = <T extends JsonObject>(cbHandler: ProectedHandler<T>) =>{
        return (message: BridgeMessage<T>) : Promise<any> => {
            if (message.sender.context === 'options' || message.sender.context === 'popup') {
                return cbHandler(message)
            }
            throw new Error('Unauthorized')
        }
    }

    const onLogin = protect(async ({data} : BridgeMessage<LoginMessage>): Promise<any> => {

        //Perform login
        return await apiCall(async ({ axios }) => {
            const { login } = usePkiAuth(`${currentConfig.value.accountBasePath}/pki`);
            await login(data.token)
            return true;
        })
    })

    const onLogout = protect(async () : Promise<void> => {
        return await apiCall(async () => {
            await logout()
            //Cleanup after logout
            clearLoginState()
        })
    })
   
    const onGetProfile = protect(async () : Promise<any> => {
        return await apiCall(async () => await getProfile())
    })

    const onGetStatus = async (): Promise<ClientStatus> => {
        return {
            //Logged in if the cookie is set and the api flag is set
            loggedIn: loggedIn.value,
            //username
            userName: userName.value,
            //dark mode flag
            darkMode: currentConfig.value.darkMode
        }
    }

    //We can send post messages to the server heartbeat endpoint to get status
    const runHeartbeat = async () => {
        //Only run if the api thinks its logged in, and config is enabled
        if (!loggedIn.value || currentConfig.value.heartbeat !== true) {
            return
        }

        try {
            //Post against the heartbeat endpoint
            await heartbeat()
        }
        catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                //If we get a 401, the user is no longer logged in
                clearLoginState()
            }
        }
    }

    //Setup autoheartbeat
    runtime.onInstalled.addListener(async () => {
        //Configure interval to run every 5 minutes to update the status
        setInterval(runHeartbeat, 60 * 1000);

        //Run immediately
        runHeartbeat();
    });
    
    return () => {
        return{
            loggedIn,
            apiCall,
            protect,
            userName,
            onLogin,
            onLogout,
            onGetProfile,
            onGetStatus
        }
    }
})()