<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUIStore } from '@/stores/ui.store';

const { t } = useI18n();
const count = ref(0);
const uiStore = useUIStore();

function openSettings() {
	// Modal key is namespaced: {pluginName}.{modalKey}
	uiStore.openModal('@n8n/plugin-hello-world.settings');
}
</script>

<template>
	<div :class="$style.helloWorld">
		<h3>👋 {{ t('plugin.helloWorld.greeting') }}</h3>
		<p>{{ t('plugin.helloWorld.description') }}</p>
		<button @click="count++">Clicked {{ count }} times</button>
		<button @click="openSettings">{{ t('plugin.helloWorld.button.openSettings') }}</button>
	</div>
</template>

<style module>
.helloWorld {
	padding: var(--spacing-s);
	margin: var(--spacing-s) 0;
	background: var(--color-background-light);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
}

.helloWorld h3 {
	margin: 0 0 var(--spacing-xs) 0;
	color: var(--color-text-dark);
	font-size: var(--font-size-m);
}

.helloWorld p {
	margin: 0 0 var(--spacing-xs) 0;
	color: var(--color-text-base);
	font-size: var(--font-size-s);
}

.helloWorld button {
	padding: var(--spacing-2xs) var(--spacing-xs);
	margin-right: var(--spacing-2xs);
	background: var(--color-primary);
	color: white;
	border: none;
	border-radius: var(--border-radius-base);
	cursor: pointer;
	font-size: var(--font-size-s);
}

.helloWorld button:hover {
	background: var(--color-primary-shade-1);
}
</style>
