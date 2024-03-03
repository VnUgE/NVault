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
import { PluginConfig, EventEntry, ConfigStatus } from '../../features/'
import { computed, shallowRef } from 'vue'
import { get } from '@vueuse/core'

export * from './allowedOrigins'
export * from './features'
export * from './identity'
export * from './mfaconfig'
export * from './permissions'

export const useStore = defineStore('main', () => {

    const loggedIn = shallowRef<boolean>(false)
    const userName = shallowRef<string>('')
    const settings = shallowRef<PluginConfig>({} as PluginConfig)
    const eventHistory = shallowRef<EventEntry[]>([])
    const status = shallowRef<ConfigStatus>({} as ConfigStatus)
    const darkMode = computed<boolean>(() => get(status).isDarkMode)
   
    return{
        loggedIn,
        userName,
        settings,
        status,
        darkMode,
        eventHistory
    } 
})
