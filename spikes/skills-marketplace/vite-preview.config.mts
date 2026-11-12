import config from '../../packages/frontend/editor-ui/vite.config.mts';

// Keep the test instance and its API proxy on loopback.
export default {
	...config,
	plugins: [
		...(config.plugins ?? []),
		{
			name: 'skills-marketplace-local-preview',
			enforce: 'post',
			config: () => ({ server: { host: '127.0.0.1' } }),
		},
	],
} satisfies typeof config;
