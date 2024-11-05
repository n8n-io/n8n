import { randomFillSync } from 'crypto';

Object.defineProperty(globalThis, 'crypto', {
	value: {
		getRandomValues: (buffer: NodeJS.ArrayBufferView) => randomFillSync(buffer),
	},
});
