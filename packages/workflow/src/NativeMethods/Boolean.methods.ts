import type { NativeDoc } from '@/Extensions/Extensions';

export const booleanMethods: NativeDoc = {
	typeName: 'Boolean',
	functions: {
		toString: {
			doc: {
				name: 'toString',
				description: 'returns a string representing this boolean value.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/toString',
				returnType: 'string',
			},
		},
	},
};
