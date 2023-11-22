<template>
    <div id="login-template" class="py-4">
        <form class="" @submit.prevent="onSubmit">
            <fieldset class="px-4 input-container">
                <label class="">Please enter your authentication token</label>
                <textarea class="w-full input" v-model="token" rows="5">
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
import { apiCall, useWait } from "@vnuge/vnlib.browser";
import { ref } from "vue";
import { useStore } from "../../store";

const { login } = useStore()
const { waiting } = useWait()

const token = ref('')

const onSubmit = async () => {
    await apiCall(async ({ toaster }) => {
        await login(token.value)
        toaster.form.success({
            'title': 'Login successful',
            'text': 'Successfully logged into your profile'
        })
    })
 
}

</script>

<style lang="scss">

</style>