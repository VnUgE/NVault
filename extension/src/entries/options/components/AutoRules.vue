<template>
    <div class="">
         <div class="flex flex-row justify-between mt-16">
            <div class="font-bold">
                Approval Rules
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
        <div class="">
            <table class="min-w-full text-sm divide-y-2 divide-gray-200 dark:divide-dark-500">
                <thead class="text-left bg-gray-50 dark:bg-dark-700">
                    <tr>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Rule
                        </th>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Origin
                        </th>
                        <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                            Time
                        </th>
                        <th class="p-2"></th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-200 dark:divide-dark-500">
                    <tr v-for="rule in currentRulePage" :key="rule.timestamp" class="">
                        <td class="p-2 t font-medium truncate max-w-[8rem] whitespace-nowrap ">
                            {{ rule.type }}
                        </td>
                        <td class="p-2 whitespace-nowrap">
                            {{ rule.origin }}
                        </td>
                        <td class="p-2 whitespace-nowrap">
                            {{ createShortDateAndTime(rule) }}
                        </td>
                        <td class="p-2 text-right whitespace-nowrap">
                            <div class="button-group">
                                <button class="rounded btn xs" @click="deleteRule(rule)">
                                    Revoke
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
import { computed } from 'vue';
import { get, useOffsetPagination } from '@vueuse/core';
import { } from '@headlessui/vue'
import { useStore } from '../../store';
import { storeToRefs } from 'pinia';
import { slice } from 'lodash';
import { type AutoAllowRule } from '../../../features'

const store = useStore()
const { } = storeToRefs(store)

const rules = computed(() => store.permissions.rules)

const { next, prev, currentPage, currentPageSize, pageCount } = useOffsetPagination({
    pageSize: 10,
    total: computed(() => rules.value.length)
})

const currentRulePage = computed(() => {
    const start = (get(currentPage) - 1) * get(currentPageSize)
    const end = start + 10
    return slice(rules.value, start, end)
})

const deleteRule = (rule: AutoAllowRule) => {
    store.plugins.permission.deleteRule(rule)
}

const createShortDateAndTime = (request: { timestamp: number}) => {
    const date = new Date(request.timestamp)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`
}


</script>

<style lang="scss">

</style>