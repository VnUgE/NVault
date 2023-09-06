<template>
    <div class="flex flex-col w-full mt-4 sm:px-2">
      
        <form @submit.prevent="">
           <div class="w-full max-w-md mx-auto">
                <h3 class="text-center">
                    Extension settings
                </h3>
                <div class="my-6">
                    <fieldset :disabled="waiting">
                        <div class="w-full">
                            <div class="flex flex-row justify-between">
                                <label class="mr-2">Always on NIP-07</label>
                                <Switch
                                    v-model="buffer.autoInject"
                                    :class="buffer.autoInject ? 'bg-primary-500 dark:bg-primary-600' : 'bg-gray-200 dark:bg-dark-600'"
                                    class="relative inline-flex items-center h-6 ml-auto rounded-full w-11"
                                >
                                    <span class="sr-only">NIP-07</span>
                                    <span
                                        :class="buffer.autoInject ? 'translate-x-6' : 'translate-x-1'"
                                        class="inline-block w-4 h-4 transition transform bg-white rounded-full"
                                    />
                                </Switch>
                            </div>
                        </div>
                        <p class="mt-1 text-xs">
                            Enable auto injection of <code>window.nostr</code> support to all websites. Sites may be able to 
                            track you if you enable this feature.
                        </p>
                    </fieldset>
                </div>
                <h3 class="text-center">
                    Server settings
                </h3>
                <p class="text-sm">
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
                <fieldset :disabled="waiting || !editMode">
                    <div class="pl-1 mt-2">
                        <div class="flex flex-row w-full">
                            <div>
                                <label class="mb-2">Stay logged in</label>
                                <Switch
                                    v-model="v$.heartbeat.$model"
                                    :class="v$.heartbeat.$model ? 'bg-primary-500 dark:bg-primary-600' : 'bg-gray-200 dark:bg-dark-600'"
                                    class="relative inline-flex items-center h-6 mx-auto rounded-full w-11"
                                >
                                    <span class="sr-only">Stay logged in</span>
                                    <span
                                        :class="v$.heartbeat.$model ? 'translate-x-6' : 'translate-x-1'"
                                        class="inline-block w-4 h-4 transition transform bg-white rounded-full"
                                    />
                                </Switch>
                            </div>
                            <div class="my-auto text-xs">
                                Enables keepalive messages to regenerate credentials when they expire
                            </div>
                        </div>
                    </div>
                    <div class="mt-2">
                        <label class="pl-1">BaseUrl</label>
                        <input class="w-full primary" v-model="v$.apiUrl.$model" :class="{'error': v$.apiUrl.$invalid }" />
                        <p class="pl-1 mt-1 text-xs text-red-500">
                            * The http path to the vault server (must start with http:// or https://)
                        </p>
                    </div>
                    <div class="mt-2">
                        <label class="pl-1">Account endpoint</label>
                        <input class="w-full primary" v-model="v$.accountBasePath.$model" :class="{ 'error': v$.accountBasePath.$invalid }" />
                        <p class="pl-1 mt-1 text-xs text-red-500">
                            * This is the path to the account server endpoint (must start with /)
                        </p>
                    </div>
                    <div class="mt-2">
                        <label class="pl-1">Nostr endpoint</label>
                        <input class="w-full primary" v-model="v$.nostrEndpoint.$model" :class="{ 'error': v$.nostrEndpoint.$invalid }" />
                        <p class="pl-1 mt-1 text-xs text-red-500">
                            * This is the path to the Nostr plugin endpoint path (must start with /)
                        </p>
                    </div>
                </fieldset>
                <div class="flex justify-end mt-2">
                    <button :disabled="!modified || waiting" class="rounded btn sm" :class="{'primary':modified}" @click="onSave">Save</button>
                </div>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { apiCall, useDataBuffer, useFormToaster, useVuelidateWrapper, useWait } from '@vnuge/vnlib.browser';
import { computed, ref, watch } from 'vue';
import { useManagment } from '~/bg-api/options.ts';
import { useToggle, watchDebounced } from '@vueuse/core';
import { maxLength, helpers, required } from '@vuelidate/validators'
import { clone, isNil } from 'lodash';
import{ Switch } from '@headlessui/vue'
import useVuelidate from '@vuelidate/core'

const { waiting } = useWait();
const form = useFormToaster();
const { getSiteConfig, saveSiteConfig } = useManagment();

const { apply, data, buffer, modified } = useDataBuffer({
    apiUrl: '',
    accountBasePath: '',
    nostrEndpoint:'',
    heartbeat:false,
    autoInject:true,
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
    darkMode:{}
}

//Configure validator and validate function
const v$ = useVuelidate(vRules, buffer)
const { validate } = useVuelidateWrapper(v$);

const editMode = ref(false);
const toggleEdit = useToggle(editMode);

const autoInject = computed(() => buffer.autoInject)

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

    form.info({
        title: 'Reloading in 4 seconds',
        text: 'Your configuration will be saved and the extension will reload in 4 seconds'
    })

    await new Promise(r => setTimeout(r, 4000));

    publishConfig();

    //disable dit
    toggleEdit();
}

const publishConfig = async () =>{
    const c = clone(buffer);
    await saveSiteConfig(c);
    await loadConfig();
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
            if(isNil(e.response?.status)){
                toaster.form.error({
                    title: 'Network error',
                    text: `Please verify your vault server address`
                });
            }

            toaster.form.error({
                title: 'Warning',
                text: `Failed to connect to the vault server. Status code: ${e.response.status}`
            });
        }
    })
}

const loadConfig = async () => {
    const config = await getSiteConfig();
    apply(config);

    //Watch for changes to autoinject value and publish changes when it does
    watchDebounced(autoInject, publishConfig, { debounce: 500 })
}

//If edit mode is toggled off, reload config
watch(editMode, v => v ? null : loadConfig());


loadConfig();

</script>

<style lang="scss">

</style>