import type { NativeDoc } from '../Extensions/Extensions';

export const booleanMethods: NativeDoc = {
	typeName: 'Boolean',
	functions: {
		toString: {
			doc: {
				name: 'toString',
				description:
					"Converts <code>true</code> to the string <code>'true'</code> and <code>false</code> to the string <code>'false'</code>.",
				examples: [
					{ example: 'true.toString()', evaluated: "'true'" },
					{ example: 'false.toString()', evaluated: "'false'" },
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/toString',
				returnType: 'string',
			},
		},
	},
};
