<template>
    <div 
      id="injected-root" 
      class="flex flex-col text-left w-[20rem] min-h-[25rem]"
    >
      
      <div class="flex flex-row w-full gap-2 p-1.5 bg-black text-white dark:bg-dark-600 shadow">
        <div class="flex flex-row flex-auto my-auto">
          <div class="my-auto mr-2">
            <img class="h-6" src="/icons/32.png" />
          </div>
          <h3 class="block my-auto">NVault</h3>
          <div class="px-3 py-.5 m-auto text-sm rounded-full h-fit active-badge" :class="[isTabAllowed ? 'active' : 'inactive']">
              {{ isTabAllowed ? 'Active' : 'Inactive' }}
          </div>
        </div>
        <div class="my-auto" v-if="loggedIn">
          <button class="rounded btn xs" @click.prevent="logout">
            <fa-icon icon="arrow-right-from-bracket" />
          </button>
        </div>
        <div class="my-auto">
          <button class="rounded btn xs" @click="openOptions">
              <fa-icon :icon="['fas', 'gear']"/>
          </button>
        </div>
      </div>

      <div v-if="!loggedIn">
        <Login></Login>
      </div>

      <div v-else class="flex justify-center">
        <div class="w-full px-3 m-auto">

            <div class="text-sm text-center">
               {{ userName }}
            </div>
            
            <div class="">
              <label class="mb-0.5 text-sm dark:text-dark-100">
                Identity
              </label>
              <IdentitySelection></IdentitySelection>
            </div>
            
            <div class="w-full mt-1">
              <div class="flex flex-col">
                <div class="flex flex-row gap-2 p-1.5 bg-gray-100 border border-gray-200 dark:bg-dark-800 dark:border-dark-400">
                  <div class="text-sm break-all">
                    {{ pubKey ?? 'No key selected' }}
                  </div>
                  <div class="my-auto ml-auto cursor-pointer" :class="{'text-primary-500': copied }">
                      <fa-icon class="mr-1" icon="copy" @click="copy(pubKey)"/>
                  </div>
                </div>
              </div>
            </div>

             <div class="mt-4">
                <label class="block mb-1 text-xs text-left dark:text-dark-100" >
                  Current origin
                </label>
                
                <div v-if="isOriginProtectionOn" class="flex flex-row w-full gap-2">
                  <input :value="currentOrigin" class="flex-1 p-1 mx-0 text-sm input" readonly/>

                  <button v-if="isTabAllowed" class="btn xs" @click="store.dissallowOrigin()">
                      <fa-icon icon="minus" />
                  </button>
                  <button v-else class="btn xs" @click="store.allowOrigin()">
                      <fa-icon icon="plus" />
                  </button>
                </div>
                
                <div v-else class="text-xs text-center">
                  <span class="">Tracking protection disabled</span>
                </div>
            </div>
        
        </div>
      </div>

      <notifications class="toaster" group="form" position="top-right" />

    </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { useStore } from "../../store";
import { apiCall, configureNotifier } from "@vnuge/vnlib.browser";
import { useClipboard } from '@vueuse/core'
import { notify } from "@kyvg/vue3-notification";
import { runtime } from "webextension-polyfill";
import Login from "./Login.vue";
import IdentitySelection from "./IdentitySelection.vue";

configureNotifier({notify, close:notify.close})

const store = useStore()
const { loggedIn, selectedKey, userName, darkMode, isTabAllowed, currentOrigin, isOriginProtectionOn } = storeToRefs(store)
const { copy, copied } = useClipboard()

const pubKey = computed(() => selectedKey!.value?.PublicKey)

const openOptions = () => runtime.openOptionsPage();

//Watch for dark mode changes and update the body class
watchEffect(() => darkMode.value ? document.body.classList.add('dark') : document.body.classList.remove('dark'));

const logout = () =>{
  apiCall(async ({ toaster }) =>{
    await store.logout()
    toaster.general.success({
      'title':'Success',
      'text': 'You have been logged out'
    })
  })
}

</script>
