<template>
	<div class="hello-world-page">
		<h1>Hello World Plugin Page</h1>
		<p>This is a test page registered by the hello-world plugin.</p>
		<p>Plugin Name: <code>@n8n/plugin-hello-world</code></p>
		<p>Route: <code>/plugin/hello-world</code></p>

		<div class="info-box">
			<h2>Plugin Routes Work!</h2>
			<p>
				This page demonstrates that plugins can register routes dynamically. The route was added to
				the router at plugin load time.
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
// Simple page component for testing plugin routes
</script>

<style scoped>
.hello-world-page {
	padding: var(--spacing-xl);
	max-width: 800px;
	margin: 0 auto;
}

h1 {
	color: var(--color-primary);
	margin-bottom: var(--spacing-l);
}

h2 {
	margin-top: var(--spacing-l);
	margin-bottom: var(--spacing-s);
}

p {
	margin-bottom: var(--spacing-s);
	line-height: var(--font-line-height-loose);
}

code {
	background-color: var(--color-background-light);
	padding: var(--spacing-4xs) var(--spacing-2xs);
	border-radius: var(--border-radius-base);
	font-family: monospace;
}

.info-box {
	margin-top: var(--spacing-xl);
	padding: var(--spacing-l);
	background-color: var(--color-background-light);
	border-left: 4px solid var(--color-primary);
	border-radius: var(--border-radius-base);
}
</style>
