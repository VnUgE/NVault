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
                                    <Switch v-model="originProtection"
                                        :class="originProtection ? 'bg-black dark:bg-gray-50' : 'bg-gray-200 dark:bg-dark-600'"
                                        class="relative inline-flex items-center h-5 rounded-full w-11">
                                        <span class="sr-only">Origin protection</span>
                                        <span :class="originProtection ? 'translate-x-6' : 'translate-x-1'"
                                            class="inline-block w-4 h-4 transition transform bg-white rounded-full dark:bg-dark-900" />
                                    </Switch>
                                    <div class="my-auto ml-2 text-sm dark:text-gray-200">
                                        Tracking protection
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mt-3">
                            <div class="flex flex-row w-fit">
                                <Switch v-model="v$.heartbeat.$model"
                                    :class="v$.heartbeat.$model ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-dark-600'"
                                    class="relative inline-flex items-center h-5 mx-auto rounded-full w-11">
                                    <span class="sr-only">Stay logged in</span>
                                    <span :class="v$.heartbeat.$model ? 'translate-x-6' : 'translate-x-1'"
                                        class="inline-block w-4 h-4 transition transform rounded-full bg-gray-50 dark:bg-dark-900" />
                                </Switch>
                                <div class="my-auto ml-2 text-sm dark:text-gray-200">
                                    Stay logged-in
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <div class="flex flex-row w-fit">
                                <Switch v-model="v$.authPopup.$model"
                                    :class="v$.authPopup.$model ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-dark-600'"
                                    class="relative inline-flex items-center h-5 mx-auto rounded-full w-11">
                                    <span class="sr-only">Permissions Popup</span>
                                    <span :class="v$.authPopup.$model ? 'translate-x-6' : 'translate-x-1'"
                                        class="inline-block w-4 h-4 transition transform rounded-full bg-gray-50 dark:bg-dark-900" />
                                </Switch>
                                <div class="my-auto ml-2 text-sm dark:text-gray-200">
                                    Permissions Popup
                                </div>
                            </div>
                        </div>
                    </fieldset>
                </div>
                <h3 class="text-center">
                    Server settings
                    <span class="my-auto ml-1 text-sm text-green-500" v-show="store.isServerValid">
                        (connected)
                    </span>
                </h3>
                <p class="text-xs dark:text-gray-400">
                    You must be careful when editing these settings as you may loose connection to your vault
                    server if you input the wrong values.
                </p>
                <div class="flex justify-end mt-2">
                    <div class="button-group">
                        <button class="rounded btn sm" @click="toggleEdit()">
                            <fa-icon v-if="editMode" icon="lock-open" />
                            <fa-icon v-else icon="lock" />
                        </button>
                        <a :href="store.status.epConfig.apiBaseUrl" target="_blank">
                            <button type="button" class="rounded btn sm">
                                <fa-icon icon="external-link-alt" />
                            </button>
                        </a>
                    </div>
                </div>
                <fieldset>
                    <div class="pl-1 mt-2">

                    </div>
                    <div class="mt-2">
                        <label class="pl-1">
                            Server Url
                        </label>
                        <input class="w-full input" :class="{'error': v$.discoveryUrl.$invalid }"
                            v-model="v$.discoveryUrl.$model" :readonly="!editMode" />
                        <p class="pl-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            * The http path to the vault server (must start with https://)
                        </p>
                    </div>
                </fieldset>
                <div class="flex justify-end mt-2">
                    <button :disabled="!modified || waiting" class="btn sm" @click="onSave">Save</button>
                </div>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { apiCall, useDataBuffer, useVuelidateWrapper, useWait } from '@vnuge/vnlib.browser';
import { computed, watch } from 'vue';
import { Mutable, useToggle, watchDebounced } from '@vueuse/core';
import { maxLength, helpers, required } from '@vuelidate/validators'
import { Switch } from '@headlessui/vue'
import { useStore } from '../../store';
import { storeToRefs } from 'pinia';
import { useVuelidate } from '@vuelidate/core'
import { PluginConfig } from '../../../features';

const store = useStore()
const { settings } = storeToRefs(store)
const { waiting } = useWait();
const { setSiteConfig } = store.plugins.settings

const { apply, buffer, modified, update } = useDataBuffer(settings.value, async sb =>{
    const newConfig = await setSiteConfig(sb.buffer)
    apply(newConfig)
    return newConfig;
})

//Watch for store settings changes and apply them
watch(settings, apply)

const originProtection = computed({
    get: () => store.isOriginProtectionOn,
    set: v => store.setOriginProtection(v)
})

const url = (val : string) => /^https?:\/\/[a-zA-Z0-9\.\:\/-]+$/.test(val);

const vRules = {
    discoveryUrl: {
        required:helpers.withMessage('Base url is required', required),
        maxLength: helpers.withMessage('Base url must be less than 100 characters', maxLength(100)),
        url: helpers.withMessage('You must input a valid url', url)
    },
    authPopup: {},
    heartbeat: {},
}

//Configure validator and validate function
const v$ = useVuelidate(vRules, buffer)
const { validate } = useVuelidateWrapper(v$ as any);

const [ editMode, toggleEdit ] = useToggle(false);

const autoInject = computed(() => buffer.autoInject)
const heartbeat = computed(() => buffer.heartbeat)
const authPopup = computed(() => buffer.authPopup)

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
    return await apiCall(async ({ toaster }) =>{
        try{

            //See if the discovery url ends with a well-known file path (also checks for well-formatted url)
            const url = new URL(buffer.discoveryUrl);

            if (url.pathname === '/'){
                //append the well-known path
                url.pathname = '/.well-known/nvault';
            }

            const result = await store.plugins.settings.testServerAddress(url.href);
           
            if (result){

                //Safe to update the buffer incase we changed it
                (buffer as Mutable<PluginConfig>).discoveryUrl = url.href;

                toaster.form.success({
                   title: 'Success',
                   text: 'Succcesfully discoverted your new Nvault server'
                });

                return true;
            }
            else{
                toaster.form.error({
                    title: 'Invalid Url',
                    text: 'The address you entered was not a valid discovery url.',
                    duration: 6000
                });
            }
        }
        catch(e){
            console.error(e);
            toaster.form.error({
                title: 'Warning',
                text: `Failed to connect to the vault server. Check your url.`
            });
        }

        return false;
    })
}

//Watch for changes to autoinject value and publish changes when it does
watchDebounced(autoInject, update, { debounce: 500, immediate: false })
watchDebounced(heartbeat, update, { debounce: 500, immediate: false })
watchDebounced(authPopup, update, { debounce: 500, immediate: false })

</script>

<style lang="scss">

</style>