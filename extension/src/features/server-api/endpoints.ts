// Copyright (C) 2024 Vaughn Nugent
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


import { useAxios } from "@vnuge/vnlib.browser";
import { Method } from "axios";

export interface EndpointDefinition {
    readonly method: Method
    path(...request: any): string
    onRequest: (...request: any) => Promise<any>
    onResponse: (response: any, request?: any) => Promise<any>
}

export interface EndpointDefinitionReg<T extends string> extends EndpointDefinition {
    readonly id: T
}

export const initEndponts = () => {

    const endpoints = new Map<string, EndpointDefinition>();

    //Get local axios
    const axios = useAxios(null);

    const registerEndpoint = <T extends string>(def: EndpointDefinitionReg<T>) => {
        //Store the handler by its id
        endpoints.set(def.id, def);
        return def;
    }

    const getEndpoint = <T extends string>(id: T): EndpointDefinition | undefined => endpoints.get(id);

    const execRequest = async <T>(id: string, ...request: any): Promise<T> => {
        const endpoint = getEndpoint(id);
        if (!endpoint) {
            throw new Error(`Endpoint ${id} not found`);
        }

        //Compute the path from the request
        const path = endpoint.path(...request);

        //Execute the request handler
        const req = await endpoint.onRequest(...request);

        //Exec the request
        const { data } = await axios.request({ method: endpoint.method, url: path, data: req });

        //exec the response handler and return its result
        return await endpoint.onResponse(data, request);
    }

    return {
        registerEndpoint,
        getEndpoint,
        execRequest
    }
}
