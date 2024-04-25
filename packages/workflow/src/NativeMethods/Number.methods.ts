import type { NativeDoc } from '@/Extensions/Extensions';

export const numberMethods: NativeDoc = {
	typeName: 'Number',
	functions: {
		toFixed: {
			doc: {
				name: 'toFixed',
				hidden: true,
				description:
					'Formats a number using fixed-point notation. `digits` defaults to null if not given.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed',
				returnType: 'string',
				args: [{ name: 'digits?', type: 'number' }],
			},
		},
		toPrecision: {
			doc: {
				name: 'toPrecision',
				hidden: true,
				description: 'Returns a string representing the number to the specified precision.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toPrecision',
				returnType: 'string',
				args: [{ name: 'precision?', type: 'number' }],
			},
		},
		toString: {
			doc: {
				name: 'toString',
				description: 'returns a string representing this number value.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toString',
				returnType: 'string',
			},
		},
	},
};
