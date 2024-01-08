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


import { defer } from "lodash";
import { RemovableRef, SerializerAsync, StorageLikeAsync, useStorageAsync, watchOnce } from "@vueuse/core";
import { type MaybeRefOrGetter, type WatchSource, isProxy, toRaw } from "vue";
import type { Watchable } from "./types";

export const waitForChange = <T extends Readonly<WatchSource<unknown>[]>>(source: [...T]):Promise<void> => {
    return new Promise((resolve) => watchOnce<any>(source, () => resolve(), { deep: true }))
}

export const waitForChangeFn = <T extends Readonly<WatchSource<unknown>[]>>(source: [...T]) => {
    return (): Promise<void> => {
        return new Promise((resolve) => watchOnce<any>(source, () => resolve(), {deep: true}))
    }
}

export const waitOne = <T extends Readonly<WatchSource<unknown>[]>>(source: [...T]): Promise<void> => {
    return new Promise((resolve) => watchOnce<any>(source, () => resolve(), { deep: true }))
}

export const useStorage = <T>(storage: any & chrome.storage.StorageArea, key: string, initialValue: MaybeRefOrGetter<T>): RemovableRef<T> => {

    const wrapper: StorageLikeAsync = {

        async getItem(key: string): Promise<any | undefined> {
            const value = await storage.get(key)
            //pass the raw value to the serializer
            return value[key] as T;
        },
        async setItem(key: string, value: any): Promise<void> {
            //pass the raw value to storage
            await storage.set({ [key]: value });
        },
        async removeItem(key: string): Promise<void> {
            await storage.remove(key);
        }
    }

    /**
     * Custom sealizer that passes the raw 
     * values to the storage, the storage 
     * wrapper above will store the raw values
     * as is.
     */
    const serializer: SerializerAsync<T> = {
        async read(value: any) {
            return value as T
        },
        async write(value: any) {
            if (isProxy(value)) {
                return toRaw(value)
            }
            return value;
        }
    }

    return useStorageAsync<T>(key, initialValue, wrapper, { serializer, deep: true, shallow: true });
}

export const onWatchableChange = (watchable: Watchable, onChangeCallback: () => Promise<any>, controls?: { immediate: boolean }) => {

    defer(async () => {
        if (controls?.immediate) {
            await onChangeCallback();
        }

        while (true) {
            await watchable.waitForChange();
            await onChangeCallback();
        }
    })
}