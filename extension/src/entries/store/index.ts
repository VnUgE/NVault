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

import 'pinia'
import { } from 'lodash'
import { defineStore } from 'pinia'
import { PluginConfig } from '../../features/'
import { NostrStoreState } from './types'

export type * from './types'
export * from './allowedOrigins'
export * from './features'
export * from './identity'
export * from './mfaconfig'
export * from './permissions'

export const useStore = defineStore({
    id: 'main',
    state: (): NostrStoreState =>({
        loggedIn: false,
        userName: '',
        settings: {} as any,
        darkMode: false,
        eventHistory: [],
    }),
    actions: {

        async login (usernameOrToken: string, password?: string) {
            await this.plugins.user.login(usernameOrToken, password);
        },

        async logout () {
            await this.plugins.user.logout();
        },

        saveSiteConfig(config: PluginConfig) {
            return this.plugins.settings.setSiteConfig(config)
        },

        async toggleDarkMode(){
            await this.plugins.settings.setDarkMode(this.darkMode === false)
        },
    },
    getters:{
         
    },
})