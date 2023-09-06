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


import { ToRefs } from 'vue';
import { NostrPubKey } from '../entries/background/types'
import { JsonObject } from "type-fest";

export interface ClientStatus extends JsonObject {
    readonly loggedIn: boolean;
    readonly userName: string;
    readonly selectedKey?: NostrPubKey;
    readonly darkMode: boolean;
}

export interface NostrIdentiy extends NostrPubKey {
    readonly UserName: string;
    readonly ExistingKey: string;
}

export interface SendMessageHandler {
    <T extends JsonObject>(action: string, data: any, context: string): Promise<T>
}

export interface UseStatusResult {
    toRefs: () => ToRefs<ClientStatus>,
    update: () => Promise<void>
}

export interface PluginConfig extends JsonObject {
    readonly apiUrl: string;
    readonly accountBasePath: string;
    readonly nostrEndpoint: string;
    readonly heartbeat: boolean;
    readonly maxHistory: number;
    readonly darkMode: boolean;
    readonly autoInject: boolean;
}