<template>
    <div class="">
        <div class="flex flex-row justify-between mt-16">
            <div class="font-bold">
                Event History
            </div>
            <div class="flex justify-center">
                <pagination :pages="pagination" />
            </div>
        </div>
        <div class="">
            <table class="min-w-full text-sm divide-y-2 divide-gray-200 dark:divide-dark-500">
                <thead class="text-left bg-gray-50 dark:bg-dark-700">
                    <tr>
                        <th class="pl-2"></th>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Event
                        </th>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Time
                        </th>
                        <th class="p-2"></th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-200 dark:divide-dark-500">
                    <tr v-for="event in evHistory" :key="event.Id" class="">
                        <td class="pl-2 whitespace-nowrap">
                            <div class="flex flex-col items-end gap-0.5">
                                <div class="">
                                    ID:
                                </div>
                                <div class="">
                                    EventId:
                                </div>
                                <div class="">
                                    PubKey:
                                </div>
                                <div class="">
                                    Content:
                                </div>
                            </div>
                        </td>
                        <td class="p-2">
                            <div class="flex flex-col flex-1 gap-0.5">
                                <div class="truncate overflow-ellipsis">
                                    {{ event.Id }}
                                </div>
                            
                                <div class="truncate overflow-ellipsis">
                                    {{ event.id }}
                                </div>
                            
                                <div class="truncate overflow-ellipsis">
                                    <a href="#" @click="goToKeyView(event)" class="text-blue-500 hover:underline">
                                        {{ event.pubkey }}
                                    </a>
                                </div>
                                <div class="truncate overflow-ellipsis">
                                    {{ event.content }}
                                </div>
                            </div>
                        </td>
                        <td class="p-2 whitespace-nowrap">
                            {{ timeAgo(event, timeStamp) }}
                        </td>
                        <td class="p-2 text-right whitespace-nowrap">
                            <div class="button-group">
                                <button class="rounded btn xs" @click="deleteEvent(event)">
                                    <fa-icon icon="trash" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { apiCall } from '@vnuge/vnlib.browser';
import { computed } from 'vue';
import { formatTimeAgo, get, useOffsetPagination, useTimestamp } from '@vueuse/core';
import { } from '@headlessui/vue'
import { useStore } from '../../store';
import { EventEntry, NostrEvent } from '../../../features';
import { map, slice } from 'lodash';
import { useQuery } from '../../../features/util';

const store = useStore()

const tabId = useQuery('t');
const keyId = useQuery('kid');

const pagination = useOffsetPagination({
    pageSize: 10,
    total: computed(() => store.eventHistory.length)
})

const explodeNote = (event: EventEntry) => JSON.parse(event.EventData) as NostrEvent

const timeStamp = useTimestamp({interval: 1000})

const evHistory = computed<Array<NostrEvent & EventEntry>>(() => {
    const start = (get(pagination.currentPage) - 1) * get(pagination.currentPageSize)
    const end = start + 10
    const page = slice(store.eventHistory, start, end)
    return map(page, event => {
        const exploded = explodeNote(event)
        return {
            ...event,
            ...exploded
        }
    })
})


const deleteEvent = (event: EventEntry) => {
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

const timeAgo = (entry: EventEntry, timeStamp: number) => {
    return formatTimeAgo(new Date(entry.Created), { }, timeStamp)
}

const goToKeyView = (key: { KeyId:string }) => {
    //Show tab0 and set key
    tabId.set('0')
    keyId.set(key.KeyId);
}

</script>

<style lang="scss">
#ev-history {
    button.page-btn {
        @apply inline-flex items-center px-2 py-2 space-x-2 font-medium rounded-full;
        @apply bg-white border border-gray-300 rounded-full hover:bg-gray-50 dark:bg-dark-600 dark:hover:bg-dark-500 dark:border-dark-300;
    }

    form tr {
        @apply sm:text-sm text-xs dark:text-gray-400 text-gray-600;
    }
}
</style>