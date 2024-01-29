<template>
    <div class="">
         <div class="flex flex-row justify-between mt-16">
            <div class="font-bold">
                Approval Rules
            </div>
            <div class="flex justify-center">
                <pagination :pages="pages" />
            </div>
        </div>
        <div class="mt-1">
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
                            Expires
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
                            <a :href="rule.origin" target="_blank" class="text-blue-500 hover:underline">
                                {{ rule.origin }}
                            </a>
                        </td>
                        <td class="p-2 whitespace-nowrap">
                            {{ getExpiration(rule) }}
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
import { formatTimeAgo, get, useOffsetPagination } from '@vueuse/core';
import { } from '@headlessui/vue'
import { useStore } from '../../store';
import { storeToRefs } from 'pinia';
import { slice } from 'lodash';
import { type AutoAllowRule } from '../../../features'

const store = useStore()
const { } = storeToRefs(store)

const rules = computed(() => store.permissions.rules)

const pages = useOffsetPagination({
    pageSize: 10,
    total: computed(() => rules.value.length)
})

const currentRulePage = computed(() => {
    const start = (get(pages.currentPage) - 1) * get(pages.currentPageSize)
    const end = start + 10
    return slice(rules.value, start, end)
})

const deleteRule = (rule: AutoAllowRule) => {
    store.plugins.permission.deleteRule(rule)
}

const getExpiration = (rule: AutoAllowRule) => {
    if (!rule.expires) {
        return "Never"
    }
    return formatTimeAgo(new Date(rule.expires))
}

</script>

<style lang="scss">

</style>