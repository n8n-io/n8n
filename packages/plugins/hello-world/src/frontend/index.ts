import { markRaw } from 'vue';
import { definePlugin } from '@n8n/extension-sdk/frontend';
import { usePostHog } from '@/stores/posthog.store';
import HelloWorld from './HelloWorld.vue';
import HelloWorldPage from './views/HelloWorldPage.vue';
import MainSidebar from '@/components/MainSidebar.vue';
import SettingsModal from './components/SettingsModal.vue';
import en from './locales/en.json';
import de from './locales/de.json';

export default definePlugin({
	shouldLoad: async () => {
		try {
			const posthog = usePostHog();

			// Check if the feature flag is enabled
			const enabled = posthog.isFeatureEnabled('hello-world-plugin');

			console.log('[hello-world] Feature flag check:', {
				flag: 'hello-world-plugin',
				enabled,
			});

			return enabled;
		} catch (error) {
			console.error('[hello-world] Error checking feature flag:', error);
			// Fail open: load plugin if we can't check the flag
			return true;
		}
	},

	routes: [
		{
			path: '/plugin/hello-world',
			name: 'PluginHelloWorld',
			components: {
				default: HelloWorldPage,
				sidebar: MainSidebar,
			},
			meta: {
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'plugin',
				},
			},
		},
	],

	modals: [
		{
			key: 'settings',
			component: markRaw(SettingsModal),
			initialState: { open: false },
		},
	],

	components: {
		HelloWorld: markRaw(HelloWorld),
	},

	locales: {
		en,
		de,
	},
});
