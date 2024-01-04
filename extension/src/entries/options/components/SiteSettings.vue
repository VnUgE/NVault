<template>
    <div class="flex flex-col w-full mt-4 sm:px-2">
      
        <form @submit.prevent="">
           <div class="w-full max-w-md mx-auto">
                <h3 class="text-center">
                    Extension settings
                </h3>
                <div class="my-6">
                    <fieldset :disabled="waiting">
                        <div class="">
                            <div class="w-full">
                                <div class="flex flex-row w-full">
                                    <Switch
                                        v-model="originProtection"
                                        :class="originProtection ? 'bg-black dark:bg-gray-50' : 'bg-gray-200 dark:bg-dark-600'"
                                        class="relative inline-flex items-center h-5 rounded-full w-11"
                                    >
                                        <span class="sr-only">Origin protection</span>
                                        <span
                                            :class="originProtection ? 'translate-x-6' : 'translate-x-1'"
                                            class="inline-block w-4 h-4 transition transform bg-white rounded-full dark:bg-dark-900"
                                        />
                                    </Switch>
                                    <div class="my-auto ml-2 text-sm dark:text-gray-200">
                                       Tracking protection
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-3">
                            <div class="flex flex-row w-fit">
                                <Switch
                                    v-model="v$.heartbeat.$model"
                                    :class="v$.heartbeat.$model ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-dark-600'"
                                    class="relative inline-flex items-center h-5 mx-auto rounded-full w-11"
                                >
                                    <span class="sr-only">Stay logged in</span>
                                    <span
                                        :class="v$.heartbeat.$model ? 'translate-x-6' : 'translate-x-1'"
                                        class="inline-block w-4 h-4 transition transform rounded-full bg-gray-50 dark:bg-dark-900"
                                    />
                                </Switch>
                                <div class="my-auto ml-2 text-sm dark:text-gray-200">
                                   Stay logged-in
                                </div>
                            </div>
                        </div>
                    </fieldset>
                </div>
                <h3 class="text-center">
                    Server settings
                </h3>
                <p class="text-xs dark:text-gray-400">
                    You must be careful when editing these settings as you may loose connection to your vault
                    server if you input the wrong values.
                </p>
                <div class="flex justify-end mt-2">
                    <div class="button-group">
                        <button class="rounded btn sm" @click="toggleEdit()">
                            <fa-icon v-if="editMode" icon="lock-open"/>
                            <fa-icon v-else icon="lock"/>
                        </button>
                        <a :href="data.apiUrl" target="_blank">
                            <button type="button" class="rounded btn sm">
                                <fa-icon icon="external-link-alt"/>
                            </button>
                        </a>
                    </div>
                </div>
                <fieldset>
                    <div class="pl-1 mt-2">
                        
                    </div>
                    <div class="mt-2">
                        <label class="pl-1">BaseUrl</label>
                        <input 
                            class="w-full input" 
                            :class="{'error': v$.apiUrl.$invalid }"
                            v-model="v$.apiUrl.$model"
                            :readonly="!editMode"
                        />
                        <p class="pl-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            * The http path to the vault server (must start with http:// or https://)
                        </p>
                    </div>
                    <div class="mt-2">
                        <label class="pl-1">Account endpoint</label>
                        <input 
                            class="w-full input" 
                            v-model="v$.accountBasePath.$model" 
                            :class="{ 'error': v$.accountBasePath.$invalid }" 
                            :readonly="!editMode"
                        />
                        <p class="pl-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            * This is the path to the account server endpoint (must start with /)
                        </p>
                    </div>
                    <div class="mt-2">
                        <label class="pl-1">Nostr endpoint</label>
                        <input 
                            class="w-full input" 
                            v-model="v$.nostrEndpoint.$model" 
                            :class="{ 'error': v$.nostrEndpoint.$invalid }"
                            :readonly="!editMode"
                        />
                        <p class="pl-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            * This is the path to the Nostr plugin endpoint path (must start with /)
                        </p>
                    </div>
                </fieldset>
                <div class="flex justify-end mt-2">
                    <button :disabled="!modified || waiting" class="rounded btn sm" @click="onSave">Save</button>
                </div>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { apiCall, useDataBuffer, useVuelidateWrapper, useWait } from '@vnuge/vnlib.browser';
import { computed, watch } from 'vue';
import { useToggle, watchDebounced } from '@vueuse/core';
import { maxLength, helpers, required } from '@vuelidate/validators'
import { Switch } from '@headlessui/vue'
import { useStore } from '../../store';
import { storeToRefs } from 'pinia';
import useVuelidate from '@vuelidate/core'

const store = useStore()
const { settings } = storeToRefs(store)
const { waiting } = useWait();

const { apply, data, buffer, modified, update } = useDataBuffer(settings.value, async sb =>{
    const newConfig = await store.saveSiteConfig(sb.buffer)
    apply(newConfig)
    return newConfig;
})

//Watch for store settings changes and apply them
watch(settings, v => apply(v))

const originProtection = computed({
    get: () => store.isOriginProtectionOn,
    set: v => store.setOriginProtection(v)
})

const url = (val : string) => /^https?:\/\/[a-zA-Z0-9\.\:\/-]+$/.test(val);
const path = (val : string) => /^\/[a-zA-Z0-9-_]+$/.test(val);

const vRules = {
    apiUrl: {
        required:helpers.withMessage('Base url is required', required),
        maxLength: helpers.withMessage('Base url must be less than 100 characters', maxLength(100)),
        url: helpers.withMessage('You must input a valid url', url)
    },
    accountBasePath: {
        required:helpers.withMessage('Account path is required', required),
        maxLength: maxLength(50),
        alphaNum: helpers.withMessage('Account path is not a valid endpoint path that begins with /', path)
    },
    nostrEndpoint:{
        required: helpers.withMessage('Nostr path is required', required),
        maxLength: maxLength(50),
        alphaNum: helpers.withMessage('Nostr path is not a valid endpoint path that begins with /', path)
    },
    heartbeat: {},
}

//Configure validator and validate function
const v$ = useVuelidate(vRules, buffer)
const { validate } = useVuelidateWrapper(v$ as any);

const [ editMode, toggleEdit ] = useToggle(false);

const autoInject = computed(() => buffer.autoInject)
const heartbeat = computed(() => buffer.heartbeat)

const onSave = async () => {

    //Validate
    const result = await validate();
    if(!result){
        return;
    }

    //Test connection to the server
    if(await testConnection() !== true){
        return;
    }

    await update();

    //disable dit
    toggleEdit();
}

const testConnection = async () =>{
    return await apiCall(async ({axios, toaster}) =>{
        try{
            await axios.get(`${buffer.apiUrl}`);
            toaster.general.success({
                title: 'Success',
                text: 'Succcesfully connected to the vault server'
            });
            return true;
        }
        catch(e){
            toaster.form.error({
                title: 'Warning',
                text: `Failed to connect to the vault server. Status code: ${(e as any).response?.status}`
            });
        }
    })
}

//Watch for changes to autoinject value and publish changes when it does
watchDebounced(autoInject, update, { debounce: 500, immediate: false })
watchDebounced(heartbeat, update, { debounce: 500, immediate: false })

</script>

<style lang="scss">

</style>