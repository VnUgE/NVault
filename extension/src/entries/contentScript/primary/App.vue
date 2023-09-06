<template>
  <html>
    <body id="injected-root">
      <notifications class="toaster" group="form" position="top-right" />
      <Prompt></Prompt>
    </body>
  </html>
</template>

<script setup lang="ts">
import { configureNotifier } from '@vnuge/vnlib.browser';
import { notify } from "@kyvg/vue3-notification";
import Prompt from './components/PromptPopup.vue'

configureNotifier({ notify, close: notify.close })

</script>