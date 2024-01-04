<template>
    <div class="text-left">
       <div class="flex flex-row w-full gap-1">
            <div class="flex-1">
                <select class="w-full input" 
                    :disabled="waiting"
                    :value="selected?.Id"
                    @change.prevent="onSelected"
                >
                    <option disabled value="">Select an identity</option>
                    <option v-for="key in allKeys" :value="key.Id">{{ key.UserName }}</option>
                </select>
            </div>
            <div class="my-auto">
                <button class="btn sm borderless" @click="store.refreshIdentities()">
                    <fa-icon icon="refresh" class="" />
                </button>
            </div>
       </div>
    </div>
</template>

<script setup lang="ts">
import { find } from 'lodash'
import { computed } from "vue";
import { useStore } from "../../store";
import { useWait } from '@vnuge/vnlib.browser'
import { storeToRefs } from 'pinia';

const { waiting } = useWait();
const store = useStore();
const { selectedKey, allKeys } = storeToRefs(store);

const onSelected = async ({target}) =>{
    //Select the key of the given id
    const selected = find(allKeys.value, {Id: target.value})
    if(selected){
        await store.selectKey(selected)
    }
}

const selected = computed(() => selectedKey?.value || { Id:"" })

</script>
