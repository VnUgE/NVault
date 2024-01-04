<template>
    <div class="flex flex-col w-full max-w-md mx-auto mt-4 sm:px-2">
        <div class="flex flex-row gap-1 mx-auto">
            <div class="mb-auto mr-1" >
                <div class="w-2 h-2 rounded-full" :class="[isOriginProtectionOn ? 'bg-primary-600' : 'bg-red-500']">
                </div>
            </div>
            <h3 class="text-2xl">
                Tracking protection
            </h3>
        </div>
        <div class="">
            <div class="p-2">
                <div class="my-1">
                    <form class="flex flex-row w-full" @submit.prevent="allowOrigin()">
                        <input class="flex-1 input primary" type="text" v-model="newOrigin" placeholder="Add new origin"/>
                        <button type="submit" class="ml-1 btn xs" >
                            <fa-icon icon="plus" />
                        </button>
                    </form>
                </div>
                <label class="font-semibold">Whitelist:</label>
                <ul class="pl-1 list-disc list-inside">
                    <li v-for="origin in allowedOrigins" :key="origin" class="my-1 text-sm">
                       <span class="">
                         {{ origin }}
                       </span>
                       <span>
                            <button class="ml-1 text-xs text-red-500" @click="store.dissallowOrigin(origin)">
                                remove
                            </button>
                       </span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useStore } from '../../store';
import { useFormToaster } from '@vnuge/vnlib.browser';
import { ref } from 'vue';

const store = useStore()
const { isOriginProtectionOn, allowedOrigins } = storeToRefs(store)
const newOrigin = ref('')
const { error, info } = useFormToaster()

const allowOrigin = async () =>{
   try {
        await store.allowOrigin(newOrigin.value)
    }
    catch (err: any) {
        error({
            title: 'Failed to allow origin',
            text: err.message
        })
        return;
    }
    info({
        title: 'Origin allowed',
        text: `Origin ${newOrigin.value} has been allowed`
    })
    newOrigin.value = ''
}

</script>