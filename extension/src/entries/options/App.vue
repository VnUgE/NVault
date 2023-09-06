<template>
  <main id="injected-root">

    <notifications class="toaster" group="form" position="top-right" />

    <div class="container flex w-full p-4 mx-auto mt-8 text-gray-800 dark:text-gray-200">
      <div class="w-full max-w-4xl mx-auto">
        <div class="">
            <h3>Nostr Vault</h3>
        </div>
        <TabGroup :selected-index="selectedTab" @change="id => selectedTab = id" >
          <TabList class="flex gap-3 pb-2 border-b border-gray-300 dark:border-dark-500">
            <Tab v-slot="{ selected }">
              <button class="border-b-2" :class="[selected ? 'border-primary-500' : 'border-transparent']">
                Identities
              </button>
            </Tab>
            <Tab v-slot="{ selected }">
              <button class="border-b-2" :class="[selected ? 'border-primary-500' : 'border-transparent']">
                Privacy
              </button>
            </Tab>
            <Tab v-slot="{ selected }">
              <button class="border-b-2" :class="[selected ? 'border-primary-500' : 'border-transparent']">
                Settings
              </button>
            </Tab>
            <Tab>
              <!-- Hidden for editing -->
            </Tab>
            <div class="m-auto">
              <div class="">
                <!-- Add spinner -->
                
              </div>
            </div>
            <div class="hidden my-auto text-sm font-semibold sm:block">
               <div v-if="userName">
                {{ userName }}
              </div>
              <div v-else>
                <div>
                  Sign In
                </div>
              </div>
            </div>
            <div class="ml-auto sm:ml-0">
              <button class="rounded btn xs" @click="toggleDark()" >
                <fa-icon v-if="darkMode" icon="sun"/>
                <fa-icon v-else icon="moon" />
              </button>
            </div>
          </TabList>
          <TabPanels>
            <TabPanel class="mt-4">
             <Identities :all-keys="allKeys" @edit-key="editKey" @update-all="reloadKeys"/>
            </TabPanel>
            <TabPanel>
              <Privacy/>
            </TabPanel>
            <TabPanel>
              <SiteSettings/>
            </TabPanel>
            <TabPanel>
              <div class="flex flex-col px-2 mt-4">
                <div class="absolute mx-auto">
                    <h4>Edit Identity</h4>
                </div>
                <div class="ml-auto">
                  <button class="rounded btn sm" @click.self="doneEditing">
                    <fa-icon class="mr-2" icon="chevron-left"/>
                    Back
                  </button>
                </div>
                <div class="flex flex-col mx-auto mt-2">
                  <div class="text-sm break-all">
                    Internal Id : {{ keyBuffer?.Id }}
                  </div>
                  <div class="text-sm break-all">
                    Public Key : {{ keyBuffer?.PublicKey }}
                  </div>
                  <div class="flex flex-col w-full max-w-md mx-auto mt-3">
                    <div class="">
                      <div class="text-sm">User Name</div>
                      <input class="w-full primary" type="text" v-model="keyBuffer.UserName"/>
                    </div>
                    <div class="gap-2 my-3 ml-auto">
                      <button class="rounded btn sm primary" @click="onUpdate">Update</button>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { 
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@headlessui/vue'
import { configureNotifier } from '@vnuge/vnlib.browser';
import { useManagment, useStatus, NostrPubKey } from '~/bg-api/options.ts';
import { notify } from "@kyvg/vue3-notification";
import { watchDebounced } from '@vueuse/core';
import SiteSettings from './components/SiteSettings.vue';
import Identities from './components/Identities.vue';
import Privacy from "./components/Privacy.vue";

//Configure the notifier to use the notification library
configureNotifier({ notify, close: notify.close })

const { userName, darkMode } = useStatus()
const { getAllKeys, updateIdentity, getSiteConfig, saveSiteConfig } = useManagment()

const selectedTab = ref(0)
const allKeys = ref([])
const keyBuffer = ref(null)

const editKey = (key: NostrPubKey) =>{
  //Goto hidden tab
  selectedTab.value = 3
  //Set selected key
  keyBuffer.value = { ...key }
}

const doneEditing = () =>{
  //Goto hidden tab
  selectedTab.value = 0
  //Set selected key
  keyBuffer.value = null
}

const onUpdate = async () =>{
  //Update identity
  await updateIdentity(keyBuffer.value)  
  //Goto hidden tab
  selectedTab.value = 0
  //Set selected key
  keyBuffer.value = null
}

const reloadKeys = async () =>{
  //Load all keys (identities)
  const keys = await getAllKeys()
  allKeys.value = keys;
}

const toggleDark = async () => {
  const config = await getSiteConfig();
  config.darkMode = !config.darkMode;
  await saveSiteConfig(config);
}

//Initial load
reloadKeys();

//If the tab changes to the identities tab, reload the keys
watchDebounced(selectedTab, id => id == 0 ? reloadKeys() : null, { debounce: 100 })

//Watch for dark mode changes and update the body class
watchEffect(() => darkMode.value ? document.body.classList.add('dark') : document.body.classList.remove('dark'));

</script>

<style lang="scss" scoped>

main {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.toaster{
  position: fixed;
  top: 15px;
  right: 0;
  z-index: 9999;
  max-width: 230px;
}

.id-card{
  @apply flex md:flex-row flex-col gap-2 p-3 text-sm duration-75 ease-in-out border-2 rounded-lg shadow-md cursor-pointer;
  @apply bg-white dark:bg-dark-700 border-gray-200 hover:border-gray-400 dark:border-dark-500 hover:dark:border-dark-200;

  &.selected{
    @apply border-primary-500 hover:border-primary-500;
  }
}

</style>