<template>
    <div 
      id="injected-root" 
      class="flex flex-col text-left w-[20rem] min-h-[25rem]"
    >
      
      <div class="flex flex-row w-full px-1 pl-4">
        <div class="flex-auto my-auto">
          <h3>NVault</h3>
        </div>
        <div class="my-auto" v-if="loggedIn">
          <button class="rounded btn sm red" @click.prevent="logout">
            <fa-icon icon="arrow-right-from-bracket" />
          </button>
        </div>
        <div class="p-2 my-auto">
          <button class="rounded btn sm" @click="openOptions">
              <fa-icon :icon="['fas', 'gear']"/>
          </button>
        </div>
      </div>
      <div v-if="!loggedIn">
        <Login></Login>
      </div>
      <div v-else class="flex justify-center pb-4">
        <div class="w-full m-auto">
          <div class="mt-2 text-center">
            {{ userName }}
            <div class="mt-4">
              <IdentitySelection></IdentitySelection>
            </div>
            <div class="mt-2.5 min-h-[6rem]">
              <div class="flex flex-col justify-center">
                
                <div class="flex flex-row gap-2 p-2 mx-3 my-3 bg-gray-100 border border-gray-200 rounded dark:bg-dark-700 dark:border-dark-400">
                  <div class="text-sm break-all">
                    {{ pubKey ?? 'No key selected' }}
                  </div>
                  <div class="my-auto ml-auto cursor-pointer" :class="{'text-primary-500': copied }">
                      <fa-icon class="mr-1" icon="copy" @click="copy(pubKey)"/>
                  </div>
                </div>
                
              </div>
            </div>
            <div class="mt-3 text-sm">
             Always on NIP-07: <span class="font-semibold" :class="{'text-blue-500':autoInject}">{{ autoInject }}</span>
            </div>
          </div>
        </div>
      </div>

      <notifications class="toaster" group="form" position="top-right" />

    </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useStatus, useManagment } from "~/bg-api/popup.ts";
import { configureNotifier } from "@vnuge/vnlib.browser";
import { asyncComputed, useClipboard, watchDebounced } from '@vueuse/core'
import { notify } from "@kyvg/vue3-notification";
import { runtime } from "webextension-polyfill";
import Login from "./Login.vue";
import IdentitySelection from "./IdentitySelection.vue";

configureNotifier({notify, close:notify.close})

const { loggedIn, userName, selectedKey, darkMode } = useStatus()
const { logout, getProfile, getSiteConfig } = useManagment()

const { copy, copied } = useClipboard()

const pubKey = computed(() => selectedKey.value?.PublicKey)
const qrCode = computed(() => pubKey.value ? `nostr:npub1${pubKey.value}` : null)

watchDebounced(loggedIn, async () => {
  //Manually update the user's profile if they are logged in and the profile is not yet loaded
  if(loggedIn.value && !userName.value){
    getProfile()
  }
},{ debounce:100, immediate: true })

const openOptions = () => runtime.openOptionsPage();

//Watch for dark mode changes and update the body class
watchEffect(() => darkMode.value ? document.body.classList.add('dark') : document.body.classList.remove('dark'));

const autoInject = asyncComputed(() => getSiteConfig().then<Boolean>(p => p.autoInject), false)

</script>

<style lang="scss">

.toaster{
  position: fixed;
  top: 15px;
  right: 0;
  z-index: 9999;
  max-width: 230px;
}

</style>
