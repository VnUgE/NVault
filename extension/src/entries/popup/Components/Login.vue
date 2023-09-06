<template>
    <div id="login-template" class="py-4">
        <form class="" @submit.prevent="onSubmit">
            <fieldset class="px-4 input-container">
                <label class="">Please enter your authentication token</label>
                <textarea class="w-full primary" v-model="token" rows="5">
                </textarea>
            </fieldset>
            <div class="flex justify-end mt-2">
                <div class="px-3">
                    <button class="w-24 rounded btn sm primary">
                        <fa-icon v-if="waiting" icon="spinner" class="animate-spin" />
                        <span v-else>Submit</span>
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { useWait } from "@vnuge/vnlib.browser";
import { ref } from "vue";
import { useManagment } from "~/bg-api/popup.ts";

const { login } = useManagment()
const { waiting } = useWait()

const token = ref('')

const onSubmit = async () => {
  //console.log(token.value)
  await login(token.value)
}

</script>

<style lang="scss">

</style>