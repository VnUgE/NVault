<template>
  <main id="injected-root">
    
    <!-- Global password/confirm promps -->
    <ConfirmPrompt />
    <PasswordPrompt />

    <notifications class="toaster" group="form" position="top-right" />

    <div class="container flex w-full p-4 mx-auto mt-8 text-black dark:text-white">
      <div class="w-full max-w-4xl mx-auto">
        <div class="">
            <h2>NVault</h2>
        </div>
        <TabGroup :selected-index="selectedTab" @change="id => selectedTab = id" >
          <TabList class="flex gap-3 pb-2 border-b border-gray-300 dark:border-dark-500">
            <Tab v-slot="{ selected }">
              <button class="tab-title" :class="{ selected }">
                Identities
              </button>
            </Tab>
            <Tab v-slot="{ selected }">
              <button class="tab-title" :class="{ selected }">
                  Account
              </button>
            </Tab>
            <Tab v-slot="{ selected }">
              <button class="tab-title" :class="{ selected }">
                Activity
              </button>
            </Tab>
            <Tab v-slot="{ selected }">
              <button class="tab-title" :class="{ selected }">
                Privacy
              </button>
            </Tab>
            <Tab v-slot="{ selected }">
              <button class="tab-title" :class="{ selected }">
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
             <Identities :all-keys="allKeys" @edit-key="editKey"/>
            </TabPanel>

            <TabPanel> <Account/> </TabPanel>

            <TabPanel> <EventHistory/> </TabPanel>

            <TabPanel> <Privacy/> </TabPanel>

            <TabPanel> <SiteSettings/> </TabPanel>
            
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
                      <input class="w-full input" type="text" v-model="keyBuffer.UserName"/>
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
import { apiCall, configureNotifier } from '@vnuge/vnlib.browser';
import { storeToRefs } from "pinia";
import { type NostrPubKey } from '../../features/';
import { notify } from "@kyvg/vue3-notification";
import SiteSettings from './components/SiteSettings.vue';
import Identities from './components/Identities.vue';
import Privacy from "./components/Privacy.vue";
import { useStore } from "../store";
import Account from "./components/Account.vue";
import ConfirmPrompt from "../../components/ConfirmPrompt.vue";
import PasswordPrompt from "../../components/PasswordPrompt.vue";
import EventHistory from "./components/EventHistory.vue";


//Configure the notifier to use the notification library
configureNotifier({ notify, close: notify.close })

const store = useStore()
const { allKeys, darkMode, userName } = storeToRefs(store)

const selectedTab = ref(0)
const keyBuffer = ref<NostrPubKey>({} as NostrPubKey)

const editKey = (key: NostrPubKey) =>{
  //Goto hidden tab
  selectedTab.value = 5
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
  
  await apiCall(async ({ toaster }) => {
    //Update identity
    await store.updateIdentity(keyBuffer.value)
    //Show success
    toaster.general.success({
      'title':'Success',
      'text': `Successfully updated ${keyBuffer.value!.UserName}`
    })
  })
  
  //Goto hidden tab
  selectedTab.value = 0
  //Set selected key
  keyBuffer.value = null
}

const toggleDark = () => store.toggleDarkMode()

//Watch for dark mode changes and update the body class
watchEffect(() => darkMode.value ? document.body.classList.add('dark') : document.body.classList.remove('dark'));

</script>

<style lang="scss">

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

.tab-title{
  @apply border-b-2 border-transparent dark:text-gray-200;
  
  &.selected{
    @apply dark:border-gray-200 border-black;
  }
}

.id-card{
  @apply flex md:flex-row flex-col gap-2 p-3 text-sm duration-75 ease-in-out border-2 rounded-lg shadow-md cursor-pointer;
  @apply bg-white dark:bg-dark-700 border-gray-200 hover:border-gray-400 dark:border-dark-500 hover:dark:border-dark-200;

  &.selected{
    @apply border-primary-500 hover:border-primary-500;
  }
}

.text-color-background{
  @apply text-gray-400 dark:text-gray-500;
}

</style>