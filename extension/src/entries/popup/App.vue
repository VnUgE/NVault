<template>
  <main>
    <PageContent />
  </main>
</template>

<script setup lang="ts">
import PageContent from "./components/PageContent.vue";

</script>

<style lang="scss">
main {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  
   @apply dark:bg-dark-900 bg-white dark:text-gray-200;
}
</style>
