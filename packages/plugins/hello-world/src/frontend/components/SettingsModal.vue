<template>
	<Modal
		:name="modalName"
		:title="t('plugin.helloWorld.settings.title')"
		:event-bus="modalBus"
		@enter="onSave"
	>
		<template #content>
			<div class="settings-content">
				<h3>{{ t('plugin.helloWorld.settings.title') }}</h3>
				<p>{{ t('plugin.helloWorld.settings.description') }}</p>
				<p>Modal data: {{ data }}</p>

				<div class="settings-form">
					<label>{{ t('plugin.helloWorld.settings.exampleSetting') }}:</label>
					<N8nInput
						v-model="exampleValue"
						type="text"
						:placeholder="t('plugin.helloWorld.settings.placeholder')"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div class="action-buttons">
				<n8n-button type="secondary" @click="onClose">
					{{ t('plugin.helloWorld.settings.cancel') }}
				</n8n-button>
				<n8n-button type="primary" @click="onSave">
					{{ t('plugin.helloWorld.settings.save') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/components/Modal.vue';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from '@n8n/utils/event-bus';

const { t } = useI18n();

interface Props {
	modalName: string;
	data?: Record<string, unknown>;
}

const props = defineProps<Props>();
const toast = useToast();
const uiStore = useUIStore();
const modalBus = createEventBus();

const exampleValue = ref('');

function onClose() {
	uiStore.closeModal(props.modalName);
}

function onSave() {
	toast.showMessage({
		title: t('plugin.helloWorld.toast.settingsSaved'),
		message: t('plugin.helloWorld.toast.settingsSavedMessage', {
			interpolate: { value: exampleValue.value },
		}),
		type: 'success',
	});
	onClose();
}
</script>

<style scoped>
.settings-content {
	padding: var(--spacing-s);
}

.settings-content h3 {
	margin: 0 0 var(--spacing-s) 0;
	color: var(--color-text-dark);
	font-size: var(--font-size-l);
}

.settings-content p {
	margin: 0 0 var(--spacing-s) 0;
	color: var(--color-text-base);
}

.settings-form {
	margin-top: var(--spacing-m);
}

.settings-form label {
	display: block;
	margin-bottom: var(--spacing-2xs);
	color: var(--color-text-dark);
	font-weight: var(--font-weight-bold);
}

.settings-form input {
	width: 100%;
	padding: var(--spacing-2xs) var(--spacing-xs);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-s);
}

.action-buttons {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-2xs);
}
</style>
