import type { NativeDoc } from '@/Extensions/Extensions';

export const numberMethods: NativeDoc = {
	typeName: 'Number',
	functions: {
		toFixed: {
			doc: {
				name: 'toFixed',
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
				description: 'Returns a string representing the number to the specified precision.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toPrecision',
				returnType: 'string',
				args: [{ name: 'precision?', type: 'number' }],
			},
		},
	},
};
