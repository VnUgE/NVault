<template>
    <div v-show="showPrompt" id="nvault-ext-prompt" :class="{'dark': darkMode }">
        
        <div class="fixed top-0 bottom-0 left-0 right-0 text-white" style="z-index:9147483647 !important" >

            <!-- Only show backdrop when prompt is on the same origin -->
            <div class="fixed inset-0 left-0 w-full h-full bg-black/50" @click.self="close" />

            <div v-if="showPopup" class="relative w-full md:max-w-[28rem] mx-auto md:mt-36 mb-auto" ref="prompt">
                <div class="w-full h-screen p-5 text-gray-800 bg-white border shadow-lg md:h-auto md:rounded dark:bg-dark-900 dark:border-dark-500 dark:text-gray-200">
                    
                    <div v-if="loggedIn" class="">
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
                                would like access to 
                            <span class="font-bold">{{ event?.msg }}</span>
                        </div>

                        <div class="flex gap-2 mt-4"> 

                            <ListBox class="max-w-40" v-model="allowRuleType" :groups="lbOptions" :modelToString="modelToString" />

                            <div class="ml-auto">
                                <button class="rounded btn sm" @click="close">Close</button>
                            </div>
                            <div>
                                <button :disabled="selectedKey?.Id == undefined" class="rounded btn sm" @click="allow()">Allow</button>
                            </div>
                        </div>
                    </div>
                    
                    <div v-else class="">
                        
                        <div class="">
                            <div class="text-lg font-bold">
                               Log in
                            </div>
                        </div>

                        <div class="py-3 text-sm text-center">
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
import { ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { get, set } from '@vueuse/core';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { clone, first, isEqual } from 'lodash';
import { useStore } from '../../../store';
import { CreateRuleType, type PermissionRequest } from '../../../../features' 
import ListBox, { Option, OptionGroup } from '../../../../components/ListBox.vue';

interface PropmtMessage extends PermissionRequest{
    msg: string;
}

const store = useStore()
const { loggedIn, selectedKey, darkMode } = storeToRefs(store)
const keyName = computed(() => selectedKey.value?.UserName)

const prompt = ref(null)
const allowRuleType = shallowRef<CreateRuleType>(CreateRuleType.AllowOnce)

const event = computed<PropmtMessage | undefined>(() => {
    //Use a the current windowpending if set
    if(store.permissions.windowPending){
        return getPromptMessage(store.permissions.windowPending)
    }
    //Otherwise use the first pending event
    const pending = first(store.permissions.pending)
    return getPromptMessage(pending)
});

const evData = computed(() => JSON.stringify(event.value || {}, null, 2))

const onSameOrigin = computed(() => isEqual(event.value?.origin, window.location.origin))
//Only show in-page popup if the event is from the same origin
const showPopup = computed(() => (store.permissions.isPopup || !store.settings.authPopup))
const showPrompt = computed(() => (onSameOrigin.value || store.permissions.isPopup) && event.value)

const site = computed(() => get(showPrompt) ? new URL(event.value?.origin || "https://example.com").host : "")

const close = () => {
    if(event.value){
        store.plugins.permission.deny(event.value.uuid);
    }

     //Reset the rule type
    allowRuleType.value = CreateRuleType.AllowOnce
}

const allow = () => {
   if (event.value) {
        store.plugins.permission.allow(event.value.uuid, allowRuleType.value);
    }
    //Reset the rule type
    set(allowRuleType, CreateRuleType.AllowOnce);
}

//Listen for events
const getPromptMessage = (perms: PermissionRequest | undefined): PropmtMessage | undefined => {

    if(!perms) return undefined

    const ev = clone(perms) as PropmtMessage
    switch(ev.requestType){
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
    return ev
}

const getRuleName = (rule: CreateRuleType) => {
    switch (rule) {
        default:
            return 'None'
        case CreateRuleType.AllowOnce:
            return "Allow Once"
        case CreateRuleType.AllowForever:
            return "Allow Forever"
        case CreateRuleType.FiveMinutes:
            return "5 Minutes"
        case CreateRuleType.OneHour:
            return "1 Hour"
        case CreateRuleType.OneDay:
            return "1 Day"
        case CreateRuleType.OneWeek:
            return "1 Week"
        case CreateRuleType.OneMonth:
            return "1 Month"
    }
}

const lbOptions = ((): OptionGroup<CreateRuleType>[] => {

    const createOption = (rule: CreateRuleType): Option<CreateRuleType> => {
        return { name: getRuleName(rule), value: rule }
    }

    const creatGroup = (name: string, options: Option<CreateRuleType>[]): OptionGroup<CreateRuleType> => {
        return { name, options }
    }

    return[
        creatGroup('Allow', [
            createOption(CreateRuleType.AllowOnce),
            createOption(CreateRuleType.AllowForever)
        ]),
        creatGroup('Allow for', [
            createOption(CreateRuleType.FiveMinutes),
            createOption(CreateRuleType.OneHour),
            createOption(CreateRuleType.OneDay),
            createOption(CreateRuleType.OneWeek),
            createOption(CreateRuleType.OneMonth)
        ])
    ]
})()

const modelToString = (rule: CreateRuleType) => getRuleName(rule)

</script>