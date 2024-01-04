<template>
    <div id="totp-settings">

        <div v-if="showTotpCode" class="w-full py-2 text-center">
            <h5 class="text-center" />
            <p class="py-2">
                Scan the QR code with your TOTP authenticator app.
            </p>

            <div class="flex">
                <VueQrcode class="m-auto" :value="qrCode" />
            </div>

            <p class="py-2">
                Your secret, if your application requires it.
            </p>

            <p
                class="flex flex-row flex-wrap justify-center p-2 bg-gray-200 border border-gray-300 dark:bg-dark-800 dark:border-dark-500">
                <span v-for="code in secretSegments" :key="code" class="px-2 font-mono tracking-wider">
                    {{ code }}
                </span>
            </p>

            <p class="py-2 text-color-background">
                Please enter your code from your authenticator app to continue.
            </p>

            <div class="m-auto w-min">
                <VOtpInput class="otp-input" input-type="letter-numeric" separator="" value="" :is-disabled="showSubmitButton"
                    input-classes="primary input rounded" :num-inputs="6" @on-change="onInput" @on-complete="VerifyTotp" />
            </div>

            <div v-if="showSubmitButton" class="flex flex-row justify-end my-2">
                <button class="btn primary" @click.prevent="CloseQrWindow">
                    Complete
                </button>
            </div>
        </div>

        <div v-else class="flex flex-row flex-wrap justify-between">
            <div class="text-sm font-bold">TOTP Authenticator App</div>

            <div v-if="totpEnabled" class="button-group">
                <button class="btn xs" @click.prevent="regenTotp">
                    <fa-icon icon="sync" />
                    <span class="pl-2">Regenerate</span>
                </button>
                <button class="btn red xs" @click.prevent="disable">
                    <fa-icon icon="minus-circle" />
                    <span class="pl-2">Disable</span>
                </button>
            </div>

            <div v-else>
                <button class="btn xs" @click.prevent="configTotp">
                    <fa-icon icon="plus" />
                    <span class="pl-2">Setup</span>
                </button>
            </div>
            <p v-if="!totpEnabled" class="p-1 pt-3 text-sm text-color-background">
                TOTP is a time based one time password. You can use it as a form of Multi Factor Authentication when
                using another device such as a smart phone or TOTP hardware device. You can use TOTP with your smart
                phone
                using apps like Google Authenticator, Authy, or Duo. Read more on
                <a class="link" href="https://en.wikipedia.org/wiki/Time-based_one-time_password" target="_blank">
                    Wikipedia.
                </a>
            </p>

            <p v-else class="w-full p-1 pt-1 text-sm text-color-background">
                TOTP is enabled for your account.
            </p>
        </div>

    </div>
</template>

<script setup lang="ts">
import { isNil, chunk, defaultTo, includes, map, join } from 'lodash'
import { TOTP } from 'otpauth'
import base32Encode from 'base32-encode'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import VOtpInput from "vue3-otp-input";
import { computed, ref } from 'vue'
import {
    useSession,
    useMessage,
    useConfirm,
    usePassConfirm,
    useFormToaster,
    MfaMethod
} from '@vnuge/vnlib.browser'
import { storeToRefs } from 'pinia';
import { useStore } from '../../store';
import { Mutable } from '@vueuse/core';
import { TotpUpdateMessage } from '../../../features/types';

type TotpConfig = Mutable<TotpUpdateMessage>

const store = useStore()
const { userName } = storeToRefs(store);

const { KeyStore } = useSession()
const { reveal } = useConfirm()
const { elevatedApiCall } = usePassConfirm()
const { onInput, setMessage } = useMessage()

const totpEnabled = computed(() => includes(store.mfaEnabledMethods, MfaMethod.TOTP))

const totpMessage = ref<TotpConfig>()
const showSubmitButton = ref(false)
const toaster = useFormToaster()

const showTotpCode = computed(() => !isNil(totpMessage.value?.secret))

const secretSegments = computed<string[]>(() => {
    //Chunk the secret into 6 character segments
    const chunks = chunk(totpMessage.value?.secret, 6)
    //Join the chunks into their chunk arrays
    return map(chunks, chunk => join(chunk, ''))
})

const qrCode = computed(() => {
    if (isNil(totpMessage.value?.secret)) {
        return ''
    }

    const m = totpMessage.value!;

    // Build the totp qr codeurl
    const params = new URLSearchParams()
    params.append('secret', m.secret)
    params.append('issuer', m.issuer)
    params.append('algorithm', m.algorithm)
    params.append('digits', defaultTo(m.digits, 6).toString())
    params.append('period', defaultTo(m.period, 30).toString())
    const url = `otpauth://totp/${m.issuer}:${userName.value}?${params.toString()}`
    return url
})

const ProcessAddOrUpdate = async () => {
    await elevatedApiCall(async ({ password }) => {

        // Init or update the totp method and get the encrypted totp message
        const totp = await store.mfaUpsertMethod(MfaMethod.TOTP, password) as TotpConfig

        // Decrypt the totp secret
        const secretBuf = await KeyStore.decryptDataAsync(totp.secret)

        // Encode the secret to base32
        totp.secret = base32Encode(secretBuf, 'RFC3548', { padding: false })

        totpMessage.value = totp
    })
}

const configTotp = async () => {
    const { isCanceled } = await reveal({
        title: 'Enable TOTP multi factor?',
        text: 'Are you sure you understand TOTP multi factor and wish to enable it?',
    })

    if (!isCanceled) {
        ProcessAddOrUpdate()
    }
}

const regenTotp = async () => {
    // If totp is enabled, show a prompt to regenerate totp
    if (!totpEnabled.value) {
        return
    }

    const { isCanceled } = await reveal({
        title: 'Are you sure?',
        text: 'If you continue your previous TOTP authenticator and recovery codes will no longer be valid.'
    })

    if (!isCanceled) {
        ProcessAddOrUpdate()
    }
}

const disable = async () => {
    // Show a confrimation prompt
    const { isCanceled } = await reveal({
        title: 'Disable TOTP',
        text: 'Are you sure you want to disable TOTP? You may re-enable TOTP later.'
    })

    if (isCanceled) {
        return
    }

    await elevatedApiCall(async ({ password }) => {
        // Disable the totp method
        await store.mfaDisableMethod(MfaMethod.TOTP, password)
    })
}

const VerifyTotp = async (code: string) => {
    // Create a new TOTP instance from the current message
    const totp = new TOTP(totpMessage.value)

    // validate the code
    const valid = totp.validate({ token: code, window: 4 })

    if (valid) {
        showSubmitButton.value = true
        toaster.success({
            title: 'Success',
            text: 'Your TOTP code is valid and your account is now verified.'
        })
    } else {
        setMessage('Your TOTP code is not valid.')
    }
}

const CloseQrWindow = () => {
    showSubmitButton.value = false
    totpMessage.value = undefined

    //Fresh methods
    store.mfaRefresh()
}

</script>

<style>
#totp-settings .otp-input input {
    @apply w-12 text-center text-lg mx-1 focus:border-primary-500;
}
</style>
