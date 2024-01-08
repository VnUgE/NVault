<template>
    <div id="ev-history" class="flex flex-col w-full mt-4 sm:px-2">
        <form @submit.prevent="">
            <div class="w-full max-w-xl mx-auto">
                <h3 class="text-center">
                    Permissions
                </h3>

                <div class="flex flex-row justify-between mt-4">
                    <div class="font-bold">
                        Pending
                    </div>
                    <div class="flex justify-center">
                    </div>
                </div>
            
                <div class="my-6 ">
                  <EvHistoryTable :readonly="false" :requests="pending" @deny="deny" @approve="approve" />
                </div>

                <AutoRules />

                <div class="flex flex-row justify-between mt-16">
                    <div class="font-bold">
                        History
                    </div>
                    <div class="flex justify-center">
                        <nav aria-label="Pagination">
                            <ul class="inline-flex items-center space-x-1 text-sm rounded-md">
                                <li>
                                    <button @click="prev" class="page-btn">
                                        <fa-icon icon="chevron-left" class="w-4" />
                                    </button>
                                </li>
                                <li>
                                    <span class="inline-flex items-center px-4 py-2 space-x-1 rounded-md">
                                        Page 
                                        <b class="mx-1">{{ currentPage }}</b> 
                                        of 
                                        <b class="ml-1">{{ pageCount }}</b>
                                    </span>
                                </li>
                                <li>
                                    <button @click="next" class="page-btn">
                                        <fa-icon icon="chevron-right" class="w-4" />
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>

                <div class="mt-1">
                  <EvHistoryTable :readonly="true" :requests="evHistoryCurrentPage" @deny="deny" @approve="approve" />
                </div>

                <div class="mt-4 ml-auto w-fit">
                    <button class="rounded btn sm red" @click="clearHistory">
                        Delete History
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { useConfirm } from '@vnuge/vnlib.browser';
import { computed } from 'vue';
import { get, useOffsetPagination } from '@vueuse/core';
import {  } from '@headlessui/vue'
import { useStore } from '../../store';
import { PermissionRequest, PrStatus } from '../../../features';
import EvHistoryTable from './EvHistoryTable.vue';
import { filter, slice } from 'lodash';
import AutoRules from './AutoRules.vue';

const store = useStore()
const { reveal } = useConfirm()

const pending = computed(() => store.permissions.pending)
const notPending = computed(() => filter(store.permissions.all, r => r.status !== PrStatus.Pending))

const deny = (request: PermissionRequest) => {
    if(request.status !== PrStatus.Pending) return
    //push deny to store
    store.plugins.permission.deny(request.uuid)
}

const approve = (request: PermissionRequest) => {
    if(request.status !== PrStatus.Pending) return
    //push allow to store
    store.plugins.permission.allow(request.uuid, false)
}

const { next, prev, currentPage, currentPageSize, pageCount } = useOffsetPagination({
    pageSize: 10,
    total: computed(() => notPending.value.length)
})

const evHistoryCurrentPage = computed(() => {
    const start = (get(currentPage) - 1) * get(currentPageSize)
    const end = start + 10
    return slice(notPending.value, start, end)
})

const clearHistory = async () => {
    const { isCanceled } = await reveal({
        title: 'Clear History',
        text: 'Are you sure you want to clear your event history?',
    })

    if(isCanceled) return

    //Clear all history
    store.plugins.permission.clearRequests()
}

</script>

<style lang="scss">
#ev-history{
    button.page-btn{
        @apply inline-flex items-center px-2 py-2 space-x-2 font-medium rounded-full;
        @apply bg-white border border-gray-300 rounded-full hover:bg-gray-50 dark:bg-dark-600 dark:hover:bg-dark-500 dark:border-dark-300;
    }

    form tr {
        @apply sm:text-sm text-xs dark:text-gray-400 text-gray-600;
    }
}
</style>