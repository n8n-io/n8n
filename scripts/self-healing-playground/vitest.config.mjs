import { fileURLToPath } from 'node:url';

export default {
	test: {
		root: fileURLToPath(new URL('.', import.meta.url)),
		include: ['*.test.mjs'],
		globals: true,
		environment: 'node',
	},
};
