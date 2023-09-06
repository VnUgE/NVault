<template>
    <div class="px-3 text-left">
       <div class="w-full">
            <div class="">
                <select class="w-full primary" 
                :disabled="waiting"
                :value="selected?.Id"
                @change.prevent="onSelected"
                >
                    <option disabled value="">Select an identity</option>
                    <option v-for="key in allKeys" :value="key.Id">{{ key.UserName }}</option>
                </select>
            </div>
       </div>
       
    </div>
</template>

<script setup lang="ts">
import { find } from 'lodash'
import { computed } from "vue";
import { useStatus, useManagment, NostrPubKey } from "~/bg-api/popup.ts";
import { useWait } from '@vnuge/vnlib.browser'
import { computedAsync } from '@vueuse/core';

const { selectedKey } = useStatus();
const { waiting } = useWait();
const { getAllKeys, selectKey } = useManagment();

const allKeys = computedAsync<NostrPubKey[]>(async () => await getAllKeys(), []);

const onSelected = async ({target}) =>{
    //Select the key of the given id
    const selected = find(allKeys.value, {Id: target.value})
    if(selected){
        await selectKey(selected)
    }
}

const selected = computed(() => selectedKey?.value || { Id:"0" })

</script>

<style lang="scss">

</style>