<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
	<div :class="$style.helloWorld">
		<h3>👋 Hello from Plugin! 2</h3>
		<p>This is a plugin component loaded dynamically.</p>
		<button @click="count++">Clicked {{ count }} times</button>
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
