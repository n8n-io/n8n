import type { NativeDoc } from '@/Extensions/Extensions';

export const objectMethods: NativeDoc = {
	typeName: 'Object',
	functions: {
		keys: {
			doc: {
				name: 'keys',
				description:
					"Returns an array of a given object's own enumerable string-keyed property names.",
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys',
				returnType: 'Array',
			},
		},
		values: {
			doc: {
				name: 'values',
				description:
					"Returns an array of a given object's own enumerable string-keyed property values.",
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values',
				returnType: 'Array',
			},
		},
	},
};
