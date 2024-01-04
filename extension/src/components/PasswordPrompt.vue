<template>
  <div id="password-prompt">
    <Dialog
      class="modal-entry"
      :style="style"
      :open="isRevealed"
      @close="close"
    >
      <div ref="dialog" class="modal-content-container" >
        <DialogPanel>
          <DialogTitle class="modal-title">
            Enter your password
          </DialogTitle>

          <DialogDescription class="modal-description">
            Please re-enter your password to continue.
          </DialogDescription>

          <form id="password-form" @submit.prevent="formSubmitted" :disabled="waiting">
            <fieldset>
                <div class="input-container">
                  <input v-model="v$.password.$model" type="password" class="rounded input primary" placeholder="Password" @input="onInput">
                </div>
            </fieldset>
          </form>

          <div class="modal-button-container">
            <button class="rounded btn sm primary" form="password-form">
              Submit
            </button>
            <button class="rounded btn sm" @click="close" >
              Close
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import useVuelidate from '@vuelidate/core'
import { reactive, ref, computed } from 'vue'
import { helpers, required, maxLength } from '@vuelidate/validators'
import { useWait, useMessage, usePassConfirm, useEnvSize, useVuelidateWrapper } from '@vnuge/vnlib.browser'
import { Dialog, DialogPanel, DialogTitle, DialogDescription } from '@headlessui/vue'

const { headerHeight } = useEnvSize()

//Use component side of pw prompt
const { isRevealed, confirm, cancel } = usePassConfirm()

const { waiting } = useWait()
const { onInput } = useMessage()

//Dialog html ref
const dialog = ref(null)

const pwState = reactive({ password: '' })

const rules = {
  password: {
    required: helpers.withMessage('Please enter your password', required),
    maxLength: helpers.withMessage('Password must be less than 100 characters', maxLength(100))
  }
}

const v$ = useVuelidate(rules, pwState, { $lazy: true })

//Wrap validator so we an display error message on validation, defaults to the form toaster
const { validate } = useVuelidateWrapper(v$);

const style = computed(() => {
  return {
    'height': `calc(100vh - ${headerHeight.value}px)`,
    'top': `${headerHeight.value}px`
  }
})

const formSubmitted = async function () {
  //Calls validate on the vuelidate instance
  if (!await validate()) {
    return
  }

  //Store pw copy
  const password = v$.value.password.$model;

  //Clear the password form
  v$.value.password.$model = '';
  v$.value.$reset();

  //Pass the password to the confirm function
  confirm({ password });
}

const close = function () {
  // Clear the password form
  v$.value.password.$model = '';
  v$.value.$reset();

  //Close prompt
  cancel(null);
}

//Cancel prompt when user clicks outside of dialog, only when its open
onClickOutside(dialog, () => isRevealed.value ? cancel() : null)

</script>