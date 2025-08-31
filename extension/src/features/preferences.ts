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

import { set } from "@vueuse/core";
import { waitForChangeFn } from "./util";
import type { Watchable } from './types';
import { type FeatureApi, type BgRuntime, type IFeatureExport,  exportForegroundApi, popupAndOptionsOnly } from "./framework";
import { type AppSettings } from "./settings";

export interface AppPreferences{
    darkMode: boolean;
    useSystemTheme: boolean;
    showNotifications: boolean;
}

/**
 * The NostrApi is the foreground api for nostr events via 
 * the background script.
 */
export interface PreferencesApi extends FeatureApi, Watchable {
    read: () => Promise<Partial<AppPreferences>>;
    write: (prefs: Partial<AppPreferences>) => Promise<void>;
}

export const usePreferencesApi = (): IFeatureExport<AppSettings, PreferencesApi> => {

    return {
        background: ({ state }: BgRuntime<AppSettings>) => {
            
            const { state: prefs } = state.useServerSlot<Partial<AppPreferences>>('nvault-preferences', { 
                darkMode: false,
                useSystemTheme: true, 
                showNotifications: true, 
            });

            return {
                waitForChange: waitForChangeFn([prefs]),
                read: () =>  Promise.resolve({ ...prefs.value }),
                write: popupAndOptionsOnly(async (newPrefs: Partial<AppPreferences>) => set(prefs, newPrefs))
            }
        },
        foreground: exportForegroundApi([
            'waitForChange',
            'read',
            'write',
        ])
    }
}
