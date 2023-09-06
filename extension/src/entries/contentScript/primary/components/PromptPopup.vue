<template>
    <div v-show="isOpen" id="nvault-ext-prompt">
        <div class="relative text-white" style="z-index:9147483647 !important" ref="prompt">
            <div class="fixed inset-0 left-0 flex justify-center w-full h-full p-4 bg-black/50">
                <div class="relative w-full max-w-md mx-auto mt-20 mb-auto">
                    <div class="w-full p-4 border rounded-lg shadow-lg bg-dark-700 border-dark-400">
                        <div v-if="loggedIn" class="">
                            <h3 class="">Allow access</h3>
                            <div class="pl-1 text-sm">
                                Identity:
                            </div>
                            <div class="p-2 mt-1 text-center border rounded border-dark-400 bg-dark-600">
                                <div :class="[selectedKey?.UserName ? '' : 'text-red-500']">
                                    {{ selectedKey?.UserName ?? 'Select Identity' }}
                                </div>
                            </div>
                            <div class="mt-5 text-center">
                                <span class="text-primary-500">{{ site }}</span>
                                 would like to access to 
                                <span class="text-yellow-500">{{ event.msg }}</span>
                            </div>
                            <div class="flex gap-2 mt-4">
                                <div class="">
                                    <Popover class="relative">
                                        <PopoverButton class="rounded btn sm">View Raw</PopoverButton>
                                        <PopoverPanel class="absolute z-10">
                                            <div class="min-w-[22rem] p-2 border rounded bg-dark-700 border-dark-400 shadow-md text-sm">
                                                <p class="pl-1">
                                                    Event Data:
                                                </p>
                                                 <div class="p-2 mt-1 text-left border rounded border-dark-400 bg-dark-600 overflow-y-auto max-h-[22rem]">
<pre>
{{ evData }}
</pre>
                                                 </div>
                                            </div>
                                        </PopoverPanel>
                                    </Popover>
                                </div>
                                <div class="ml-auto">
                                    <button :disabled="selectedKey?.Id == undefined" class="rounded btn primary sm" @click="allow">Allow</button>
                                </div>
                                <div>
                                    <button class="rounded btn sm red" @click="close">Close</button>
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
                                    <button class="rounded btn sm red" @click="close">Close</button>
                                </div>
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
import { usePrompt } from '~/entries/contentScript/nostr-shim'
import { computed } from '@vue/reactivity';
import { onClickOutside } from '@vueuse/core';
import { useStatus } from '~/bg-api/content-script.ts';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { first } from 'lodash';

const { loggedIn, selectedKey } = useStatus()

const prompt = ref(null)

interface PopupEvent{
    type: string
    msg: string
    origin: string
    data: any
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

//Setup click outside
//onClickOutside(prompt, () => isOpen.value ? close() : null)

//Listen for events
usePrompt(async (ev: PopupEvent) => {

    console.log('usePrompt', ev)

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
    }

    return new Promise((resolve, reject) => {
        evStack.value.push({
            ...ev,
            allow: () => resolve(true),
            close: () => resolve(false),
        })
    })
})


</script>

<style lang="scss">


</style>
