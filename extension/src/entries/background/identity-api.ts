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

import { NostrIdentiy } from "../../bg-api/types";
import { useAuthApi } from "./auth-api";
import { useSettings } from "./settings";

export const useIdentityApi = (() => {

    const { handleProtectedApicall } = useAuthApi();
    const { currentConfig } = useSettings();

    const onCreateIdentity = handleProtectedApicall<NostrIdentiy>(async (data, { axios }) => {
        //Create a new identity
        const response = await axios.put(`${currentConfig.value.nostrEndpoint}?type=identity`, data)

        if (response.data.success) {
            return response.data.result;
        }
        
        //If we get here, the login failed
        throw { response }
    })

    const onUpdateIdentity = handleProtectedApicall(async (data, { axios }) => {
        delete data.Created;
        delete data.LastModified;

        //Create a new identity
        const response = await axios.patch(`${currentConfig.value.nostrEndpoint}?type=identity`, data)

        if (response.data.success) {
            return response.data.result;
        }

        //If we get here, the login failed
        throw { response }
    })

    return () =>{
        return{
            onCreateIdentity,
            onUpdateIdentity
        }
    }

})()