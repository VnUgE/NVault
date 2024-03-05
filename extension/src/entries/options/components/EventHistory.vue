<template>
    <div class="">
        <div class="flex flex-row justify-between mt-16">
            <div class="font-bold">
                Event History
            </div>
            <div class="flex justify-center">
                <pagination :pages="pages" />
                <div class="ml-2">
                    <button class="btn borderless sm" @click="refresh()">
                        <fa-icon :class="{ 'animate-spin': !ready }" icon="sync" />
                    </button>
                </div>
            </div>
        </div>
        <div class="mt-2">
            <table class="min-w-full text-sm divide-y-2 divide-gray-200 dark:divide-dark-500">
                <thead class="text-left bg-gray-50 dark:bg-dark-700">
                    <tr>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Account
                        </th>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Kind
                        </th>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Note
                        </th>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Time
                        </th>
                        <th class="p-2"></th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-200 dark:divide-dark-500">
                    <tr v-for="event in evHistory" :key="event.Id" class="">
                        <td class="pl-2 truncate whitespace-nowrap overflow-ellipsis">
                            <a href="#" @click="goToKeyView(event)" class="text-blue-500 hover:underline">
                                {{ lookupKeyFromLoadedKeys(event.pubkey) }}
                            </a>
                        </td>
                        <td class="p-2">
                            {{ event.kind }}
                        </td>
                        <td class="p-2 max-w-40">
                            <div class="truncate overflow-ellipsis">
                                {{ event.content }}
                            </div>
                        </td>
                        <td class="p-2 whitespace-nowrap">
                            {{ timeAgo(event, timeStamp) }}
                        </td>
                        <td class="flex">
                            <div class="my-1 button-group">
                                <button class="btn xs" @click="deleteEvent(event)">
                                    <fa-icon icon="trash" />
                                </button>
                                <button class="w-8 btn xs" @click="showEvent(event)">
                                    <fa-icon icon="ellipsis-v" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <Dialog :open="openEvent != null" @close="showEvent()">

        <div class="fixed inset-0 bg-black/40" aria-hidden="true" />

        <!-- Full-screen container to center the panel -->
        <div class="fixed inset-0 flex justify-center w-screen p-4 mt-36">
            <!-- The actual dialog panel -->
            <DialogPanel
                class="w-full max-w-xl p-3 mb-auto bg-white border border-gray-400 dark:bg-dark-800 dark:text-white dark:border-dark-500">
                <DialogTitle class="text-lg font-bold"> Event Details </DialogTitle>
                <div class="mt-2">

                </div>
                <div class="">

                    <div class="grid justify-center grid-flow-row grid-cols-3 text-left">

                        <div class="">
                            <h5 class="text-sm font-bold">Kind</h5>
                        </div>
                        <div class="">
                            <h5 class="text-sm font-bold">Time</h5>
                        </div>
                        <div class="">
                            <h5 class="text-sm font-bold">User</h5>
                        </div>

                        <div class="">
                            <p class="text-sm">{{ openEvent?.kind }}</p>
                        </div>
                        <div class="">
                            <p class="text-sm">{{ createShortDateAndTime(openEvent!) }}</p>
                        </div>
                        <div class="">
                            <p class="text-sm">
                                {{ lookupKeyFromLoadedKeys(openEvent!.pubkey) }}
                            </p>
                        </div>
                    </div>
                    <div class="mt-4 ">
                        <h4 class="text-sm font-bold">Content</h4>
                        <p
                            class="p-2 mt-2 text-sm text-gray-600 whitespace-pre-wrap bg-gray-100 dark:bg-dark-700 dark:text-gray-300 max-h-[16rem] overflow-y-auto">
                            {{ openEvent?.content }}
                        </p>
                    </div>
                    <div class="mt-4">
                        <h4 class="text-sm font-bold">Tags</h4>
                        <p class="px-2 overflow-x-auto max-w-[100%]">
                        <ul class="max-h-[16rem] overflow-y-auto">
                            <li v-for="tag in openEvent?.tags" :key="tag"
                                class="my-1 text-xs text-gray-600 dark:text-gray-400">
                                {{ tag }}
                            </li>
                        </ul>
                        </p>
                    </div>
                    <div class="mt-4 ">
                        <h4 class="text-sm font-bold">Event ID</h4>
                        <p
                            class="p-2 mt-2 text-sm text-gray-600 whitespace-pre-wrap bg-gray-100 dark:bg-dark-700 dark:text-gray-300 max-h-[16rem] overflow-y-auto">
                            {{ openEvent?.id }}
                        </p>
                    </div>
                    <div class="mt-4 ">
                        <h4 class="text-sm font-bold">Signature</h4>
                        <p
                            class="p-2 mt-2 text-sm text-gray-600 whitespace-pre-wrap bg-gray-100 dark:bg-dark-700 dark:text-gray-300 max-h-[16rem] overflow-y-auto">
                            {{ openEvent?.sig }}
                        </p>
                    </div>
                </div>

            </DialogPanel>
        </div>

    </Dialog>
</template>

<script setup lang="ts">
import { apiCall, useConfirm } from '@vnuge/vnlib.browser';
import { computed } from 'vue';
import { formatTimeAgo, get, useOffsetPagination, useTimeout, useTimestamp } from '@vueuse/core';
import { useStore } from '../../store';
import { EventEntry, NostrEvent } from '../../../features';
import { find, map, slice } from 'lodash';
import { useQuery } from '../../../features/util';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'

const store = useStore()

const tabId = useQuery('t');
const keyId = useQuery('kid');
const openEvId = useQuery('activeEvent');

const { reveal } = useConfirm()

const pages = useOffsetPagination({
    pageSize: 10,
    total: computed(() => store.eventHistory.length)
})

const explodeNote = (event: EventEntry) => JSON.parse(event.EventData) as NostrEvent

const timeStamp = useTimestamp({interval: 1000})

const evHistory = computed<Array<NostrEvent & EventEntry>>(() => {
    const start = (get(pages.currentPage) - 1) * get(pages.currentPageSize)
    const end = start + get(pages.currentPageSize)
    const page = slice(store.eventHistory, start, end)
    return map(page, event => {
        const exploded = explodeNote(event)
        return {
            ...event,
            ...exploded
        }
    })
})

const openEvent = computed<NostrEvent & EventEntry | undefined>(() => find(evHistory.value, e => e.Id === openEvId.asRef.value))
const showEvent = (event?: EventEntry) => openEvId.set(event?.Id ?? '')

const deleteEvent = async (event: EventEntry) => {

    const { isCanceled } = await reveal({
        title: 'Delete Event',
        text: 'Are you sure you want to delete this event forever?',
    })

    if(isCanceled) return

    //Call delete event function
    apiCall(() => store.plugins.history.deleteEvent(event))
}

const createShortDateAndTime = (request: EventEntry) => {
    const date = new Date(request.Created)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`
}

const lookupKeyFromLoadedKeys = (pubkey: string) => {
    return find(store.allKeys, { PublicKey: pubkey })?.UserName ?? pubkey
}

const timeAgo = (entry: EventEntry, timeStamp: number) => {
    return formatTimeAgo(new Date(entry.Created), { }, timeStamp)
}

const goToKeyView = (key: { KeyId:string }) => {
    //Show tab0 and set key
    tabId.set('0')
    keyId.set(key.KeyId);
}

const { ready, start } = useTimeout(500, { controls: true })

const refresh = () => {
    store.plugins.history.refresh();
    start();
}


</script>

<style lang="scss">
#ev-history {
    form tr {
        @apply sm:text-sm text-xs dark:text-gray-400 text-gray-600;
    }
}
</style>