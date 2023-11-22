<template>
    <div class="sm:px-3">
        <div class="flex justify-end gap-2 text-black dark:text-white">
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
                    <PopoverButton class="rounded btn sm">Create</PopoverButton>
                    <PopoverOverlay v-if="open" class="fixed inset-0 bg-black opacity-50" />
                    <PopoverPanel class="absolute z-10 mt-2 md:-right-0" v-slot="{ close }">
                        <div class="p-3 bg-white border border-gray-200 rounded shadow-lg dark:border-dark-600 dark:bg-dark-900">
                            <div class="text-sm w-80">
                                <form @submit.prevent="e => onCreate(e, close)">
                                    <span class="text-lg dark:text-gray-200">
                                        Create keypair
                                    </span>
                                    <div class="mt-4">
                                        <input class="w-full rounded input" type="text" name="username" placeholder="username"/>
                                    </div>
                                    <div class="mt-3">
                                        <input class="w-full rounded input" type="text" name="key" placeholder="Existing secret key?"/>
                                        <div class="p-1.5 text-xs text-gray-600 dark:text-gray-400">
                                            Optional, hexadecimal private key (64 characters)
                                        </div>
                                    </div>
                                    <div class="flex justify-end mt-2">
                                        <button class="rounded sm btn" type="submit">Create</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </PopoverPanel>
                </Popover>
            </div>
        </div>
        <div v-for="key in allKeys" :key="key.Id" class="mt-2 mb-3">
            <div class="" :class="{'selected': isSelected(key)}" @click.self="selectKey(key)">
                
                <div class="mb-8">
                    <div class="cursor-pointer w-fit" @click="selectKey(key)">
                        <h3 :class="[ isSelected(key) ? 'underline' : 'dark:hover:text-gray-300 hover:text-gray-700']" class="duration-100 ease-out">
                           {{ key.UserName }}
                        </h3>
                    </div>
                    <div class="mt-3">
                        <p class="text-xs text-gray-700 truncate dark:text-gray-300">
                            {{ key.PublicKey }}
                        </p>
                        <div class="flex flex-row gap-3 mt-1 text-xs text-gray-600 dark:text-gray-500">
                            <div class="">
                                {{ prettyPrintDate(key) }}
                            </div>
                             <div class="">
                                <button class="text-red-700" @click="onDeleteKey(key)">
                                    Delete
                                </button>
                            </div>
                            <div class="">
                                <button class="" @click="editKey(key)">
                                    Edit
                                </button>
                            </div>
                            <div class="">
                                <button class="" @click="copy(key.PublicKey)">
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <a class="hidden" ref="downloadAnchor"></a>
    </div>
</template>

<script setup lang="ts">

import { isEqual, map } from 'lodash'
import { ref } from "vue";
import {
    Popover,
    PopoverButton,
    PopoverPanel,
    PopoverOverlay
} from '@headlessui/vue'
import { apiCall, configureNotifier } from '@vnuge/vnlib.browser';
import { NostrPubKey } from '../../../features';
import { notify } from "@kyvg/vue3-notification";
import { get, useClipboard } from '@vueuse/core';
import { useStore } from '../../store';
import { storeToRefs } from 'pinia';

const emit = defineEmits(['edit-key'])

//Configre the notifier to use the toaster
configureNotifier({ notify, close: notify.close })

const downloadAnchor = ref<HTMLAnchorElement>()
const store = useStore()
const { selectedKey, allKeys } = storeToRefs(store)
const { copy } = useClipboard()


const isSelected = (me : NostrPubKey) => isEqual(me, selectedKey.value)
const editKey = (key : NostrPubKey) => emit('edit-key', key);
const selectKey = (key: NostrPubKey) => store.selectKey(key)

const onCreate = async (e: Event, onClose : () => void) => {

    //get username input from event
    const UserName = e.target['username']?.value as string
    //try to get existing key field
    const ExistingKey = e.target['key']?.value as string

    await apiCall(async () => {
           //Create new identity
        await store.createIdentity({ UserName, ExistingKey })
    })
   
    onClose()
}

const prettyPrintDate = (key : NostrPubKey) => {
    const d = new Date(key.LastModified)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

const onDeleteKey = async (key : NostrPubKey) => {
    
    if(!confirm(`Are you sure you want to delete ${key.UserName}?`)){
        return;
    } 

    apiCall(async ({ toaster }) => {
        //Delete identity
        await store.deleteIdentity(key)
        toaster.general.success({
            'title': 'Success',
            'text': `${key.UserName} has been deleted`
        })
    })
}

const onNip05Download = () => {
    apiCall(async () => {
          //Get all public keys from the server
        const keys = get(allKeys)
        const nip05 = {}
        //Map the keys to the NIP-05 format
        map(keys, k => nip05[k.UserName] = k.PublicKey)
        //create file blob
        const blob = new Blob([JSON.stringify({ names:nip05 })], { type: 'application/json' })
       
        const anchor = get(downloadAnchor);
        anchor!.href = URL.createObjectURL(blob);
        anchor!.setAttribute('download', 'nip05.json')
        anchor!.click();
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