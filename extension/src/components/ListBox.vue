<template>
     <Listbox as="div" class="relative w-full">

        <ListboxButton class="inline-flex items-center w-full overflow-hidden bg-white border rounded-md dark:bg-dark-800 dark:border-dark-500">
            <span class="flex-1 px-4 py-2 text-gray-600 dark:text-inherit border-e dark:border-dark-500 text-sm/none hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-gray-100" >
                {{ $props.modelToString(model) }}
            </span>
            <span class="h-full p-2 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-gray-100">
                <span class="sr-only">Menu</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </span>
        </ListboxButton>

        <transition
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <ListboxOptions 
                role="menu"
                class="absolute z-10 w-full mt-1 bg-white border border-gray-100 divide-y divide-gray-100 rounded-md shadow-lg end-0 dark:divide-dark-600 dark:border-dark-500 dark:bg-dark-800"
            >
                <div 
                    v-for="group in $props.groups"
                    :key="group.name"
                    class=""
                >
                    <strong class="block p-2 text-xs font-medium text-gray-400 uppercase dark:text-gray-400">
                        {{ group.name }}
                    </strong>
                    
                    <ListboxOption
                        v-slot="{ active, selected }"
                        v-for="option in group.options"
                        :key="option.name"
                        :value="option.value"
                        as="template"
                        @click.prevent="select(option.value)"
                    >
                        <li
                            class='relative px-6 py-1 text-sm duration-75 ease-linear cursor-default select-none'
                            :class="[active ? 'bg-blue-300 text-blue-900' : 'text-gray-900 dark:text-gray-100']"
                        >
                            <span class="block truncate" :class="[selected ? 'font-medium' : 'font-normal']">
                                {{ option.name }}
                            </span>

                            <span v-if="selected" class="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                <CheckIcon class="w-5 h-5" aria-hidden="true" />
                            </span>
                        </li>
                    </ListboxOption>
                </div>
            </ListboxOptions>
        </transition>
       
    </Listbox>
</template>

<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue'

const model = defineModel<any>({ required: true })
defineProps<ListboxProps<any>>();

const select = (value: any) => model.value = value

export interface Option<T>{
    readonly name: string
    readonly value: T
}

export interface OptionGroup<T>{
    readonly name: string
    readonly options: Option<T>[]
}

export interface ListboxProps<T>{
    readonly modelValue: T;
    readonly groups: OptionGroup<T>[];
    modelToString(value:T): string;
}

</script>