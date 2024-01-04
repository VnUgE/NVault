<template>
    <div id="account-settings-template" class="mt-4">
        <div class="flex flex-col w-full max-w-lg gap-4 mx-auto">
            <div class="">
                <h3 class="text-center">Account Settings</h3>
                <div class="">

                </div>
            </div>
            <div class="">
                <div class="w-full font-bold border-b border-gray-200 dark:border-dark-500">
                    Multi Factor
                </div>
                <div class="mt-4">
                    <Totp />
                </div>
                <div class="mt-8 ">
                     <Pki />
                </div>
            </div>
            <div class="mt-6">
                <h4>Password</h4>
                <div class="">
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Pki from './Pki.vue';
import Totp from './Totp.vue';

</script>