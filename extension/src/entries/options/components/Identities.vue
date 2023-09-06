<template>
    <div class="sm:px-3">
        <div class="flex justify-end gap-2">
             <div class="">
                <div class="">
                    <button class="rounded btn sm" @click="onNip05Download">
                        NIP-05
                        <fa-icon icon="download" class="ml-1" />
                    </button>
                </div>
            </div>
            <div class="mb-2">
                <Popover class="relative" v-slot="{ open }">
                    <PopoverButton class="rounded btn primary sm">Create</PopoverButton>
                    <PopoverOverlay v-if="open" class="fixed inset-0 bg-black opacity-30" />
                    <PopoverPanel class="absolute z-10 mt-2 md:-left-12" v-slot="{ close }">
                        <div class="p-4 bg-white border border-gray-200 rounded-md shadow-lg dark:border-dark-300 dark:bg-dark-700">
                            <div class="text-sm w-72">
                                <form @submit.prevent="e => onCreate(e, close)">
                                    Create new nostr identity
                                    <div class="mt-2">
                                        <input class="w-full primary" type="text" name="username" placeholder="User Name"/>
                                    </div>
                                    <div class="mt-2">
                                        <input class="w-full primary" type="text" name="key" placeholder="Existing key?"/>
                                        <div class="p-1.5 text-xs text-gray-600 dark:text-gray-300">
                                            Optional, hexadecimal private key (64 characters)
                                        </div>
                                    </div>
                                    <div class="flex justify-end mt-2">
                                        <button class="rounded btn sm primary" type="submit">Create</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </PopoverPanel>
                </Popover>
            </div>
        </div>
        <div v-for="key in allKeys" :key="key" class="mt-2 mb-3">
            <div class="id-card" :class="{'selected': isSelected(key)}" @click.self="selectKey(key)">
                
                <div class="flex flex-col min-w-0" @click="selectKey(key)">
                    <div class="py-2">

                        <table class="w-full text-sm text-left border-collapse">
                            <thead class="">
                                <tr>
                                    <th scope="col" class="p-2 font-medium">Nip 05</th>
                                    <th scope="col" class="p-2 font-medium">Modified</th>
                                    <th scope="col" class="p-2 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody class="border-t border-gray-100 divide-y divide-gray-100 dark:border-dark-500 dark:divide-dark-500">
                                <tr>
                                    <th class="p-2 font-medium">{{ key.UserName }}</th>
                                    <td class="p-2">{{ prettyPrintDate(key) }}</td>
                                    <td class="flex justify-end p-2 ml-auto text-sm font-medium">
                                        <div class="ml-auto button-group">
                                            <button class="btn sm borderless" @click="copy(key.PublicKey)">
                                                <fa-icon icon="copy"/>
                                            </button>
                                            <button class="btn sm borderless" @click="editKey(key)">
                                                <fa-icon icon="edit"/>
                                            </button>
                                            <button class="btn sm red borderless" @click="onDeleteKey(key)">
                                                <fa-icon icon="trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        
                    </div>
                    <div class="py-2 overflow-hidden border-gray-500 border-y dark:border-dark-500 text-ellipsis">
                        <span class="font-semibold">pub:</span>
                        <span class="ml-1">{{ key.PublicKey }}</span> 
                    </div>
                    <div class="py-2">
                        <strong>Id:</strong> {{ key.Id }}
                    </div>
                </div>
            </div>
        </div>
        <a class="hidden" ref="downloadAnchor"></a>
    </div>
</template>

<script setup lang="ts">

import { isEqual, map } from 'lodash'
import { ref, toRefs } from "vue";
import {
    Popover,
    PopoverButton,
    PopoverPanel
} from '@headlessui/vue'
import { apiCall, configureNotifier } from '@vnuge/vnlib.browser';
import { useManagment, useStatus } from '~/bg-api/options.ts';
import { notify } from "@kyvg/vue3-notification";
import { useClipboard } from '@vueuse/core';
import { NostrIdentiy } from '~/bg-api/bg-api';
import { NostrPubKey } from '../../background/types';

const emit = defineEmits(['edit-key', 'update-all'])
const props = defineProps<{
    allKeys:NostrIdentiy[]
}>()

const { allKeys } = toRefs(props)

//Configre the notifier to use the toaster
configureNotifier({ notify, close: notify.close })

const downloadAnchor = ref<HTMLAnchorElement>()
const { selectedKey } = useStatus()
const { selectKey, createIdentity, deleteIdentity, getAllKeys } = useManagment()
const { copy } = useClipboard()

const isSelected = (me : NostrIdentiy) => isEqual(me, selectedKey.value)

const editKey = (key : NostrIdentiy) => emit('edit-key', key);

const onCreate = async (e: Event, onClose : () => void) => {

    //get username input from event
    const UserName = e.target['username']?.value as string
    //try to get existing key field
    const ExistingKey = e.target['key']?.value as string

    //Create new identity
    await createIdentity({ UserName, ExistingKey })
    //Update keys
    emit('update-all');
    onClose()
}

const prettyPrintDate = (key : NostrIdentiy) => {
    const d = new Date(key.LastModified)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

const onDeleteKey = async (key : NostrIdentiy) => {
    
    if(!confirm(`Are you sure you want to delete ${key.UserName}?`)){
        return;
    } 

    //Delete identity
    await deleteIdentity(key)

    //Update keys
    emit('update-all');
}

const onNip05Download = () => {
    apiCall(async () => {
          //Get all public keys from the server
        const keys = await getAllKeys() as NostrPubKey[]
        const nip05 = {}
        //Map the keys to the NIP-05 format
        map(keys, k => nip05[k.UserName] = k.PublicKey)
        //create file blob
        const blob = new Blob([JSON.stringify({ names:nip05 })], { type: 'application/json' })
       
        //Download the file
        downloadAnchor.value!.href = URL.createObjectURL(blob);
        downloadAnchor.value?.setAttribute('download', 'nostr.json')
        downloadAnchor.value?.click();
        
    })
}

</script>

<style scoped lang="scss">

.id-card{
  @apply flex md:flex-row flex-col gap-2 p-3 px-12 text-sm duration-75 ease-in-out border-2 rounded-lg shadow-md cursor-pointer w-fit mx-auto;
  @apply bg-white dark:bg-dark-800 border-gray-200 hover:border-gray-400 dark:border-dark-500 hover:dark:border-dark-200;

  &.selected{
    @apply border-primary-500 hover:border-primary-500;
  }
}

</style>