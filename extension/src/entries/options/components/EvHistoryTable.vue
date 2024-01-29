<template>
    <table class="min-w-full divide-y-2 divide-gray-200 dark:divide-dark-500">
        <thead class="text-left bg-gray-50 dark:bg-dark-700">
            <tr>
                <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                    Type
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
            <tr v-for="req in requests" :key="req.uuid" class="">
                <td class="p-2 t font-medium truncate max-w-[8rem] whitespace-nowrap ">
                    {{ req.requestType }}
                </td>
                <td class="p-2 whitespace-nowrap">
                    <a :href="req.origin" target="_blank" class="text-blue-500 hover:underline">
                        {{ req.origin }}
                    </a>
                </td>
                <td class="p-2 whitespace-nowrap">
                    {{ createShortDateAndTime(req) }}
                </td>
                <td class="p-2 text-right whitespace-nowrap">
                    <div v-if="!readonly" class="button-group">
                        <button class="rounded btn xs" @click="approve(req)">
                            <fa-icon icon="check" class="inline" />
                        </button>
                        <button class="rounded btn red xs" @click="deny(req)">
                            <fa-icon icon="trash-can" class="inline" />
                        </button>
                    </div>
                    <div v-else class="text-sm font-bold">
                        {{ statusToString(req.status) }}
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { PermissionRequest, PrStatus } from '../../../features';

const emit = defineEmits(['deny', 'approve'])
const props = defineProps<{
    requests: PermissionRequest[],
    readonly: boolean
}>()

const { requests, readonly } = toRefs(props)

const createShortDateAndTime = (request: PermissionRequest) => {
    const date = new Date(request.timestamp)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`
}

const deny = (request: PermissionRequest) => emit('deny', request)
const approve = (request: PermissionRequest) => emit('approve', request)

const statusToString = (status: PrStatus) => {
    switch(status) {
        case PrStatus.Approved:
            return 'Approved'
        case PrStatus.Denied:
            return 'Denied'
        case PrStatus.Pending:
            return 'Pending'
    }
}

</script>