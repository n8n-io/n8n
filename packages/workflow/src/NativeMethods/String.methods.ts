import type { NativeDoc } from '@/Extensions/Extensions';

export const stringMethods: NativeDoc = {
	typeName: 'String',
	properties: {
		length: {
			doc: {
				name: 'length',
				description: 'Returns the number of characters in the string.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length',
				returnType: 'number',
			},
		},
	},
	functions: {
		concat: {
			doc: {
				name: 'concat',
				description: 'Concatenates the string arguments to the calling string.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/concat',
				returnType: 'string',
			},
		},
		endsWith: {
			doc: {
				name: 'endsWith',
				description: 'Checks if a string ends with `searchString`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith',
				returnType: 'boolean',
				args: [{ name: 'searchString', type: 'string' }],
			},
		},
		indexOf: {
			doc: {
				name: 'indexOf',
				description: 'Returns the index of the first occurrence of `searchString`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf',
				returnType: 'number',
				args: [
					{ name: 'searchString', type: 'string' },
					{ name: 'position?', type: 'number' },
				],
			},
		},
		lastIndexOf: {
			doc: {
				name: 'lastIndexOf',
				description: 'Returns the index of the last occurrence of `searchString`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/lastIndexOf',
				returnType: 'number',
				args: [
					{ name: 'searchString', type: 'string' },
					{ name: 'position?', type: 'number' },
				],
			},
		},
		match: {
			doc: {
				name: 'match',
				description: 'Retrieves the result of matching a string against a regular expression.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match',
				returnType: 'Array',
				args: [{ name: 'regexp', type: 'string|RegExp' }],
			},
		},
		includes: {
			doc: {
				name: 'includes',
				description: 'Checks if `searchString` may be found within the calling string.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes',
				returnType: 'boolean',
				args: [
					{ name: 'searchString', type: 'string' },
					{ name: 'position?', type: 'number' },
				],
			},
		},
		replace: {
			doc: {
				name: 'replace',
				description:
					'Returns a string with matches of a `pattern` replaced by a `replacement`. If `pattern` is a string, only the first occurrence will be replaced.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace',
				returnType: 'string',
				args: [
					{ name: 'pattern', type: 'string|RegExp' },
					{ name: 'replacement', type: 'string' },
				],
			},
		},
		replaceAll: {
			doc: {
				name: 'replaceAll',
				description: 'Returns a string with matches of a `pattern` replaced by a `replacement`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll',
				returnType: 'string',
				args: [
					{ name: 'pattern', type: 'string|RegExp' },
					{ name: 'replacement', type: 'string' },
				],
			},
		},
		search: {
			doc: {
				name: 'search',
				description: 'Returns a string that matches `pattern` within the given string.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/search',
				returnType: 'string',
				args: [{ name: 'pattern', type: 'string|RegExp' }],
			},
		},
		slice: {
			doc: {
				name: 'slice',
				description:
					'Returns a section of a string. `indexEnd` defaults to the length of the string if not given.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice',
				returnType: 'string',
				args: [
					{ name: 'indexStart', type: 'number' },
					{ name: 'indexEnd?', type: 'number' },
				],
			},
		},
		split: {
			doc: {
				name: 'split',
				description:
					'Returns the substrings that result from dividing the given string with `separator`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split',
				returnType: 'Array',
				args: [
					{ name: 'separator', type: 'string|RegExp' },
					{ name: 'limit?', type: 'number' },
				],
			},
		},
		startsWith: {
			doc: {
				name: 'startsWith',
				description: 'Checks if the string begins with `searchString`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith',
				returnType: 'boolean',
				args: [
					{ name: 'searchString', type: 'string' },
					{ name: 'position?', type: 'number' },
				],
			},
		},
		substring: {
			doc: {
				name: 'substring',
				description:
					'Returns the part of the string from the start index up to and excluding the end index, or to the end of the string if no end index is supplied.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring',
				returnType: 'string',
				args: [
					{ name: 'indexStart', type: 'number' },
					{ name: 'indexEnd?', type: 'number' },
				],
			},
		},
		toLowerCase: {
			doc: {
				name: 'toLowerCase',
				description: 'Formats a string to lowercase. Example: "this is lowercase”.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLowerCase',
				returnType: 'string',
			},
		},
		toUpperCase: {
			doc: {
				name: 'toUpperCase',
				description: 'Formats a string to lowercase. Example: "THIS IS UPPERCASE”.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toUpperCase',
				returnType: 'string',
			},
		},
		trim: {
			doc: {
				name: 'trim',
				description: 'Removes whitespace from both ends of a string and returns a new string.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim',
				returnType: 'string',
			},
		},
		trimEnd: {
			doc: {
				name: 'trimEnd',
				description: 'Removes whitespace from the end of a string and returns a new string.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimEnd',
				returnType: 'string',
			},
		},
		trimStart: {
			doc: {
				name: 'trimStart',
				description: 'Removes whitespace from the beginning of a string and returns a new string.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimStart',
				returnType: 'string',
			},
		},
	},
};
