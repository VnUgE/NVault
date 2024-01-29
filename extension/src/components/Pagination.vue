<template>
    <div class="inline-flex items-center justify-center gap-3">
      <a
        href="#"
        @click.prevent="$props.pages.prev()"
        class="inline-flex items-center justify-center w-8 h-8 text-gray-900 bg-white border border-gray-100 rounded rtl:rotate-180 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
      >
            <span class="sr-only">Next Page</span>
            <fa-icon icon="chevron-left" class="w-4" />
      </a>

      <p class="text-xs text-gray-900 dark:text-white">
        {{ $props.pages.currentPage }}
        <span class="mx-0.25">/</span>
        {{ $props.pages.pageCount }}
      </p>

      <a
        href="#"
        @click.prevent="$props.pages.next()"
        class="inline-flex items-center justify-center w-8 h-8 text-gray-900 bg-white border border-gray-100 rounded rtl:rotate-180 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
      >
        <span class="sr-only">Next Page</span>
        <fa-icon icon="chevron-right" class="w-4" />
      </a>
    </div>
</template>

<script setup lang="ts">
import { useOffsetPagination } from '@vueuse/core';

defineProps<{
    pages: ReturnType<typeof useOffsetPagination>
}>()

</script>