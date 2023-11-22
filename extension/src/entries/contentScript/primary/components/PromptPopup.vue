<template>
    <div v-show="isOpen" id="nvault-ext-prompt" :class="{'dark': darkMode }">
        
        <div class="absolute top-0 bottom-0 left-0 right-0 text-white" style="z-index:9147483647 !important" >
            <div class="fixed inset-0 left-0 w-full h-full bg-black/50" @click.self="close" />
            <div class="relative w-full max-w-[28rem] mx-auto mt-36 mb-auto" ref="prompt">
                <div class="w-full p-5 bg-white border rounded-lg shadow-lg dark:bg-dark-900 dark:border-dark-500">
                    <div v-if="loggedIn" class="text-gray-800 dark:text-gray-200">

                        <div class="flex flex-row justify-between">
                            <div class="">
                                <div class="text-lg font-bold">
                                    Allow access
                                </div>
                                <div class="text-sm">
                                    <span class="">
                                        Identity:
                                    </span>
                                    <span :class="[keyName ? '' : 'text-red-500']">
                                        {{ keyName ?? 'Select Identity' }}
                                    </span>
                                </div>
                            </div>
                                <div class="">
                                <Popover class="relative">
                                    <PopoverButton class="">
                                        <fa-icon icon="circle-info" class="w-4 h-4" />
                                    </PopoverButton>
                                    <PopoverPanel class="absolute right-0 z-10">
                                        <div class="min-w-[22rem] p-2 border rounded dark:bg-dark-800 bg-gray-50 dark:border-dark-500 shadow-md text-sm">
                                            <p class="pl-1">
                                                Event Data:
                                            </p>
                                            <div class="p-2 mt-1 text-left border rounded dark:border-dark-500 border-gray-300 overflow-auto max-h-[22rem] max-w-lg">
                                                <pre>{{ evData }}</pre>
                                            </div>
                                        </div>
                                    </PopoverPanel>
                                </Popover>
                            </div>
                        </div>
                        
                        <div class="py-3 text-sm text-center">
                            <span class="font-bold">{{ site }}</span>
                                would like to access to 
                            <span class="font-bold">{{ event?.msg }}</span>
                        </div>

                        <div class="flex gap-2 mt-4"> 
                            <div class="ml-auto">
                                <button class="rounded btn sm" @click="close">Close</button>
                            </div>
                            <div>
                                <button :disabled="selectedKey?.Id == undefined" class="rounded btn sm" @click="allow">Allow</button>
                            </div>
                        </div>
                    </div>
                    <div v-else class="">
                        <h3 class="">Log in!</h3>
                        <div class="">
                            You must log in before you can allow access.
                        </div>
                        <div class="flex justify-end gap-2 mt-4">
                            <div>
                                <button class="rounded btn xs" @click="close">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePrompt, type UserPermissionRequest } from '../../util'
import { computed } from 'vue';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { clone, first } from 'lodash';
import { useStore } from '../../../store';
import { storeToRefs } from 'pinia';

const store = useStore()
const { loggedIn, selectedKey, darkMode } = storeToRefs(store)
const keyName = computed(() => selectedKey.value?.UserName)

const prompt = ref(null)

interface PopupEvent extends UserPermissionRequest {
    allow: () => void
    close: () => void
}

const evStack = ref<PopupEvent[]>([])
const isOpen = computed(() => evStack.value.length > 0)
const event = computed<PopupEvent | undefined>(() => first(evStack.value));

const site = computed(() => new URL(event.value?.origin || "https://example.com").host)
const evData = computed(() => JSON.stringify(event.value || {}, null, 2))


const close = () => {
    //Pop the first event off
    const res = evStack.value.shift()
    res?.close()
}
const allow = () => {
    //Pop the first event off
    const res = evStack.value.shift()
    res?.allow()
}

//Listen for events
usePrompt((ev: UserPermissionRequest):Promise<boolean> => {

    ev = clone(ev)

    console.log('[usePrompt] =>', ev)

    switch(ev.type){
        case 'getPublicKey':
            ev.msg = "your public key"
            break;
        case 'signEvent':
            ev.msg = "sign an event"
            break;
        case 'getRelays':
            ev.msg = "get your preferred relays"
            break;
        case 'nip04.encrypt':
            ev.msg = "encrypt data"
            break;
        case 'nip04.decrypt':
            ev.msg = "decrypt data"
            break;
        default:
            ev.msg = "unknown event"
            break;
    }

    return new Promise((resolve) => {
        evStack.value.push({
            ...ev,
            allow: () => resolve(true),
            close: () => resolve(false),
        })
    })
})

</script>
