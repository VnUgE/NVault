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


import { defer, filter, isEqual } from "lodash";
import { RemovableRef, SerializerAsync, StorageLikeAsync, useStorageAsync, watchOnce, get, set } from "@vueuse/core";
import { type MaybeRefOrGetter, type WatchSource, isProxy, toRaw, MaybeRef, shallowRef } from "vue";
import type { Watchable } from "./types";

export const waitForChange = <T extends Readonly<WatchSource<unknown>[]>>(source: [...T]):Promise<void> => {
    return new Promise((resolve) => watchOnce<any>(source, () => defer(() => resolve()), { deep: true }))
}

export const waitForChangeFn = <T extends Readonly<WatchSource<unknown>[]>>(source: [...T]) => {
    return (): Promise<void> => waitForChange(source)
}

/**
 * Waits for a change to occur on the given watch source
 * once.
 * @returns A promise that resolves when the change occurs.
 */
export const waitOne = waitForChange;

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

    return useStorageAsync<T>(key, initialValue, wrapper, { serializer, shallow: true });
}

export const onWatchableChange = ({ waitForChange }: Watchable, onChangeCallback: () => Promise<any>, controls?: { immediate: boolean }) => {

    defer(async () => {
        if (controls?.immediate) {
            await onChangeCallback();
        }

        while (true) {
            await waitForChange();
            await onChangeCallback();
        }
    })
}

export const push = <T>(arr: MaybeRef<T[]>, item: T | T[]) => {
    //get the reactuve value first
    const current = get(arr)
    if (Array.isArray(item)) {
        //push the items
        current.push(...item)
    } else {
        //push the item
        current.push(item)
    }
    //set the value
    set(arr, current)
}

export const remove = <T>(arr: MaybeRef<T[]>, item: T) => {
    //get the reactuve value first
    const current = get(arr)
    //Get all items that are not the item
    const wo = filter(current, (i) => !isEqual(i, item))
    //set the value
    set(arr, wo)
}

export const useQuery = (query: string) => {

    const get = () => {
        const args = new URLSearchParams(window.location.search)
        return args.get(query)
    }

    const set = (value: string) => {
        const args = new URLSearchParams(window.location.search);
        args.set(query, value);
        (window as any).customHistory.replaceState({}, '', `${window.location.pathname}?${args.toString()}`)
    }

    const mutable = shallowRef<string | null>(get())

    //Setup custom historu
    if (!('customHistory' in window)) {
        (window as any).customHistory = {
            replaceState: (...args: any[]) => {
                window.history.replaceState(...args)
                window.dispatchEvent(new Event('replaceState'))
            }
        }
    }

    //Listen for custom history events and update the mutable state
    window.addEventListener('replaceState', () => mutable.value = get())

    return{
        get,
        set,
        asRef: mutable
    }
}