<template>
    <div id="login-template" class="py-4">
        <TabGroup @change="onChange">
            <TabList as="div" class="flex flex-row mx-auto mb-3 font-bold w-fit">
                <Tab 
                    class="p-0.5 mx-1 border-b"
                    :class="[ isActive(0) ? 'border-gray-400' : 'border-transparent']"
                >
                    OTP
                </Tab>
                <Tab 
                    class="p-0.5 mx-1 border-b"
                    :class="[ isActive(1) ? 'border-gray-400' : 'border-transparent']"
                >
                    User/Pass
                </Tab>
            </TabList>
            <TabPanels>
                <TabPanel>
                    <OtpLogin />
                </TabPanel>
                <TabPanel>
                    <PassLogin />
                </TabPanel>
            </TabPanels>
        </TabGroup>
    </div>
</template>

<script setup lang="ts">
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import PassLogin from "./PassLogin.vue";
import OtpLogin from "./OtpLogin.vue";
import { shallowRef } from 'vue';

const activeTab = shallowRef(0)

const onChange = (index: any) => {
    activeTab.value = index
}

const isActive = (index: any) => activeTab.value === index

</script>

<style lang="scss">

</style>