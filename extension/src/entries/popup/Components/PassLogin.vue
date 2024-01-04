<template>
    <div v-if="showTotp" class="">
         <form id="totp-login" class="" @submit.prevent="">
            <fieldset class="px-4 input-container">
                <div class="text-center">
                    <label class="text-sm text-center">Enter your totp code</label>
                    <div class="m-auto mt-3 w-min">
                        <VOtpInput 
                            class="otp-input" 
                            input-type="letter-numeric" 
                            separator="" 
                            value="" 
                            input-classes="primary input rounded" 
                            :num-inputs="6" 
                            @on-complete="onSubmitTotp" 
                        />
                    </div>
                </div>
            </fieldset>
        </form>
    </div>
    <div v-else>
          <form class="" @submit.prevent="onSubmit()">
            <fieldset class="px-4 input-container">
                <div class="">
                    <label class="">Username</label>
                    <input type="text" name="username" class="w-full input" v-model="username" />
                </div>
                <div class="mt-1">
                    <label class="">Password</label>
                    <input type="password" name="password" class="w-full input" v-model="password" />
                </div>
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
import { useStore } from '../../store';
import { computed, shallowRef } from 'vue';
import { apiCall, useWait } from "@vnuge/vnlib.browser";
import { isEmpty, toNumber } from 'lodash';
import VOtpInput from "vue3-otp-input";

const { waiting } = useWait()
const store = useStore();

const showTotp = computed(() => store.mfaStatus?.type === 'totp')

const username = shallowRef('');
const password = shallowRef('');

const onSubmit = () => {

    //Invoke user-pass login
    apiCall(async ({ toaster }) => {
        
        //Validate
        if(isEmpty(username.value) || isEmpty(password.value)) {
            toaster.form.error({
                title:'Please enter your username and password'
            })
            return
        }
        
        await store.login(username.value, password.value)
    });
};

const onSubmitTotp = (code: string) => {
    //Invoke totp login
    apiCall(() => store.plugins.user.submitMfa({ code: toNumber(code) }));
};

</script>

<style lang="scss">
   #totp-login .otp-input input {
    @apply w-10 p-0.5 rounded text-center text-lg mx-1 focus:border-primary-500;
}
</style>