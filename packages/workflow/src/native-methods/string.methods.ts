import type { NativeDoc } from '../extensions/extensions';

export const stringMethods: NativeDoc = {
	typeName: 'String',
	properties: {
		length: {
			doc: {
				name: 'length',
				description: 'The number of characters in the string',
				examples: [{ example: '"hello".length', evaluated: '5' }],
				section: 'query',
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
				description:
					'Joins one or more strings onto the end of the base string. Alternatively, use the <code>+</code> operator (see examples).',
				examples: [
					{ example: "'sea'.concat('food')", evaluated: "'seafood'" },
					{ example: "'sea' + 'food'", evaluated: "'seafood'" },
					{ example: "'work'.concat('a', 'holic')", evaluated: "'workaholic'" },
				],
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/concat',
				args: [
					{
						name: 'strings',
						optional: false,
						variadic: true,
						description: 'The strings to append, in order',
						type: 'string[]',
					},
				],
				returnType: 'string',
			},
		},
		endsWith: {
			doc: {
				name: 'endsWith',
				description:
					'Returns <code>true</code> if the string ends with <code>searchString</code>. Case-sensitive.',
				examples: [
					{ example: "'team'.endsWith('eam')", evaluated: 'true' },
					{ example: "'team'.endsWith('Eam')", evaluated: 'false' },
					{
						example: "'teaM'.toLowerCase().endsWith('eam')",
						evaluated: 'true',
						description:
							"Returns false if the case doesn't match, so consider using .toLowerCase() first",
					},
				],
				section: 'query',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith',
				returnType: 'boolean',
				args: [
					{
						name: 'searchString',
						optional: false,
						description: 'The text to check against the end of the base string',
						type: 'string',
					},
					{
						name: 'end',
						optional: true,
						description: 'The end position (index) to start searching from',
						type: 'number',
					},
				],
			},
		},
		indexOf: {
			doc: {
				name: 'indexOf',
				description:
					'Returns the index (position) of the first occurrence of <code>searchString</code> within the base string, or -1 if not found. Case-sensitive.',
				examples: [
					{ example: "'steam'.indexOf('tea')", evaluated: '1' },
					{ example: "'steam'.indexOf('i')", evaluated: '-1' },
					{
						example: "'STEAM'.indexOf('tea')",
						evaluated: '-1',
						description:
							"Returns -1 if the case doesn't match, so consider using .toLowerCase() first",
					},
					{ example: "'STEAM'.toLowerCase().indexOf('tea')", evaluated: '1' },
				],
				section: 'query',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf',
				returnType: 'number',
				args: [
					{
						name: 'searchString',
						optional: false,
						description: 'The text to search for',
						type: 'string',
					},
					{
						name: 'start',
						optional: true,
						description: 'The position (index) to start searching from',
						default: '0',
						type: 'number',
					},
				],
			},
		},
		lastIndexOf: {
			doc: {
				name: 'lastIndexOf',
				description:
					'Returns the index (position) of the last occurrence of <code>searchString</code> within the base string, or -1 if not found. Case-sensitive.',
				examples: [
					{ example: "'canal'.lastIndexOf('a')", evaluated: '3' },
					{ example: "'canal'.lastIndexOf('i')", evaluated: '-1' },
					{
						example: "'CANAL'.lastIndexOf('a')",
						evaluated: '-1',
						description:
							"Returns -1 if the case doesn't match, so consider using .toLowerCase() first",
					},
					{ example: "'CANAL'.toLowerCase().lastIndexOf('a')", evaluated: '3' },
				],
				section: 'query',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/lastIndexOf',
				returnType: 'number',
				args: [
					{
						name: 'searchString',
						optional: false,
						description: 'The text to search for',
						type: 'string',
					},
					{
						name: 'end',
						optional: true,
						description: 'The position (index) to stop searching at',
						default: '0',
						type: 'number',
					},
				],
			},
		},
		match: {
			doc: {
				name: 'match',
				description:
					'Matches the string against a <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions">regular expression</a>. Returns an array containing the first match, or all matches if the <code>g</code> flag is set in the regular expression. Returns <code>null</code> if no matches are found. \n\nFor checking whether text is present, consider <code>includes()</code> instead.',
				examples: [
					{
						example: '"rock and roll".match(/r[^ ]*/g)',
						evaluated: "['rock', 'roll']",
						description: "Match all words starting with 'r'",
					},
					{
						example: '"rock and roll".match(/r[^ ]*/)',
						evaluated: "['rock']",
						description: "Match first word starting with 'r' (no 'g' flag)",
					},
					{
						example: '"ROCK and roll".match(/r[^ ]*/ig)',
						evaluated: "['ROCK', 'roll']",
						description: "For case-insensitive, add 'i' flag",
					},
				],
				section: 'query',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match',
				returnType: 'string[]',
				args: [
					{
						name: 'regexp',
						optional: false,
						description:
							'A <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions">regular expression</a> with the pattern to look for. Will look for multiple matches if the <code>g</code> flag is present (see examples).',
						type: 'RegExp',
					},
				],
			},
		},
		includes: {
			doc: {
				name: 'includes',
				description:
					'Returns <code>true</code> if the string contains the <code>searchString</code>. Case-sensitive.',
				section: 'query',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes',
				returnType: 'boolean',
				args: [
					{
						name: 'searchString',
						optional: false,
						description: 'The text to search for',
						type: 'string',
					},
					{
						name: 'start',
						optional: true,
						description: 'The position (index) to start searching from',
						default: '0',
						type: 'number',
					},
				],
				examples: [
					{ example: "'team'.includes('tea')", evaluated: 'true' },
					{ example: "'team'.includes('i')", evaluated: 'false' },
					{
						example: "'team'.includes('Tea')",
						evaluated: 'false',
						description:
							"Returns false if the case doesn't match, so consider using .toLowerCase() first",
					},
					{ example: "'Team'.toLowerCase().includes('tea')", evaluated: 'true' },
				],
			},
		},
		replace: {
			doc: {
				name: 'replace',
				description:
					'Returns a string with the first occurrence of <code>pattern</code> replaced by <code>replacement</code>. \n\nTo replace all occurrences, use <code>replaceAll()</code> instead.',
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace',
				returnType: 'string',
				args: [
					{
						name: 'pattern',
						optional: false,
						description:
							'The pattern in the string to replace. Can be a string to match or a <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions">regular expression</a>.',
						type: 'string|RegExp',
					},
					{
						name: 'replacement',
						optional: false,
						description: 'The new text to replace with',
						type: 'string',
					},
				],
				examples: [
					{
						example: "'Red or blue or green'.replace('or', 'and')",
						evaluated: "'Red and blue or green'",
					},
					{
						example:
							'let text = "Mr Blue has a blue house and a blue car";\ntext.replace(/blue/gi, "red");',
						evaluated: "'Mr red has a red house and a red car'",
						description: 'A global, case-insensitive replacement:',
					},
					{
						example:
							'let text = "Mr Blue has a blue house and a blue car";\ntext.replace(/blue|house|car/gi, (t) => t.toUpperCase());',
						evaluated: "'Mr BLUE has a BLUE HOUSE and a BLUE CAR'",
						description: 'A function to return the replacement text:',
					},
				],
			},
		},
		replaceAll: {
			doc: {
				name: 'replaceAll',
				description:
					'Returns a string with all occurrences of <code>pattern</code> replaced by <code>replacement</code>',
				examples: [
					{
						example: "'Red or blue or green'.replaceAll('or', 'and')",
						evaluated: "'Red and blue and green'",
					},
					{
						example:
							"text = 'Mr Blue has a blue car';\ntext.replaceAll(/blue|car/gi, t => t.toUpperCase())",
						description:
							"Uppercase any occurrences of 'blue' or 'car' (You must include the 'g' flag when using a regex)",
						evaluated: "'Mr BLUE has a BLUE CAR'",
					},
					{
						example: 'text.replaceAll(/blue|car/gi, function(x){return x.toUpperCase()})',
						evaluated: "'Mr BLUE has a BLUE CAR'",
						description: 'Or with traditional function notation:',
					},
				],
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll',
				returnType: 'string',
				args: [
					{
						name: 'pattern',
						optional: false,
						description:
							'The pattern in the string to replace. Can be a string to match or a <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions">regular expression</a>.',
						type: 'string|RegExp',
					},
					{
						name: 'replacement',
						optional: false,
						description:
							'The new text to replace with. Can be a string or a function that returns a string (see examples).',
						type: 'string|Function',
					},
				],
			},
		},
		search: {
			doc: {
				name: 'search',
				description:
					'Returns the index (position) of the first occurrence of a pattern within the string, or -1 if not found. The pattern is specified using a <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions">regular expression</a>. To use text instead, see <code>indexOf()</code>.',
				examples: [
					{
						example: '"Neat n8n node".search(/n[^ ]*/)',
						evaluated: '5',
						description: "Pos of first word starting with 'n'",
					},
					{
						example: '"Neat n8n node".search(/n[^ ]*/i)',
						evaluated: '0',
						description:
							"Case-insensitive match with 'i'\nPos of first word starting with 'n' or 'N'",
					},
				],
				section: 'query',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/search',
				returnType: 'string',
				args: [
					{
						name: 'regexp',
						optional: false,
						description:
							'A <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions">regular expression</a> with the pattern to look for',
						type: 'RegExp',
					},
				],
			},
		},
		slice: {
			doc: {
				name: 'slice',
				description:
					'Extracts a fragment of the string at the given position. For more advanced extraction, see <code>match()</code>.',
				examples: [
					{ example: "'Hello from n8n'.slice(0, 5)", evaluated: "'Hello'" },
					{ example: "'Hello from n8n'.slice(6)", evaluated: "'from n8n'" },
					{ example: "'Hello from n8n'.slice(-3)", evaluated: "'n8n'" },
				],
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice',
				returnType: 'string',
				args: [
					{
						name: 'start',
						optional: false,
						description:
							'The position to start from. Positions start at 0. Negative numbers count back from the end of the string.',
						type: 'number',
					},
					{
						name: 'end',
						optional: true,
						description:
							'The position to select up to. The character at the end position is not included. Negative numbers select from the end of the string. If omitted, will extract to the end of the string.',
						type: 'string',
					},
				],
			},
		},
		split: {
			doc: {
				name: 'split',
				description:
					"Splits the string into an array of substrings. Each split is made at the <code>separator</code>, and the separator isn't included in the output. \n\nThe opposite of using <code>join()</code> on an array.",
				examples: [
					{ example: '"wind,fire,water".split(",")', evaluated: "['wind', 'fire', 'water']" },
					{ example: '"me and you and her".split("and")', evaluated: "['me ', ' you ', ' her']" },
					{
						example: '"me? you, and her".split(/[ ,?]+/)',
						evaluated: "['me', 'you', 'and', 'her']",
						description: "Split one or more of space, comma and '?' using a regular expression",
					},
				],
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split',
				returnType: 'string[]',
				args: [
					{
						name: 'separator',
						optional: true,
						description:
							'The string (or regular expression) to use for splitting. If omitted, an array with the original string is returned.',
						type: 'string',
					},
					{
						name: 'limit',
						optional: true,
						description:
							'The max number of array elements to return. Returns all elements if omitted.',
						type: 'number',
					},
				],
			},
		},
		startsWith: {
			doc: {
				name: 'startsWith',
				description:
					'Returns <code>true</code> if the string starts with <code>searchString</code>. Case-sensitive.',
				examples: [
					{ example: "'team'.startsWith('tea')", evaluated: 'true' },
					{ example: "'team'.startsWith('Tea')", evaluated: 'false' },
					{
						example: "'Team'.toLowerCase().startsWith('tea')",
						evaluated: 'true',
						description:
							"Returns false if the case doesn't match, so consider using .toLowerCase() first",
					},
				],
				section: 'query',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith',
				returnType: 'boolean',
				args: [
					{
						name: 'searchString',
						optional: false,
						description: 'The text to check against the start of the base string',
						type: 'string',
					},
					{
						name: 'start',
						optional: true,
						description: 'The position (index) to start searching from',
						default: '0',
						type: 'number',
					},
				],
			},
		},
		substring: {
			doc: {
				name: 'substring',
				description:
					'Extracts a fragment of the string at the given position. For more advanced extraction, see <code>match()</code>.',
				examples: [
					{ example: "'Hello from n8n'.substring(0, 5)", evaluated: "'Hello'" },
					{ example: "'Hello from n8n'.substring(6)", evaluated: "'from n8n'" },
				],
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring',
				returnType: 'string',
				args: [
					{
						name: 'start',
						optional: false,
						description: 'The position to start from. Positions start at 0.',
						type: 'number',
					},
					{
						name: 'end',
						optional: true,
						description:
							'The position to select up to. The character at the end position is not included. If omitted, will extract to the end of the string.',
						type: 'string',
					},
				],
			},
		},
		toLowerCase: {
			doc: {
				name: 'toLowerCase',
				description: 'Converts all letters in the string to lower case',
				section: 'case',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLowerCase',
				returnType: 'string',
				examples: [{ example: '"I\'m SHOUTing".toLowerCase()', evaluated: '"i\'m shouting"' }],
			},
		},
		toUpperCase: {
			doc: {
				name: 'toUpperCase',
				description: 'Converts all letters in the string to upper case (capitals)',
				examples: [{ example: '"I\'m not angry".toUpperCase()', evaluated: '"I\'M NOT ANGRY"' }],
				section: 'case',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toUpperCase',
				returnType: 'string',
			},
		},
		trim: {
			doc: {
				name: 'trim',
				description:
					'Removes whitespace from both ends of the string. Whitespace includes new lines, tabs, spaces, etc.',
				examples: [{ example: "'   lonely   '.trim()", evaluated: "'lonely'" }],
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim',
				returnType: 'string',
			},
		},
		trimEnd: {
			doc: {
				name: 'trimEnd',
				description:
					'Removes whitespace from the end of a string and returns a new string. Whitespace includes new lines, tabs, spaces, etc.',
				examples: [{ example: "'   lonely   '.trimEnd()", evaluated: "'   lonely'" }],
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimEnd',
				returnType: 'string',
			},
		},
		trimStart: {
			doc: {
				name: 'trimStart',
				description:
					'Removes whitespace from the beginning of a string and returns a new string. Whitespace includes new lines, tabs, spaces, etc.',
				examples: [{ example: "'   lonely   '.trimStart()", evaluated: "'lonely   '" }],
				section: 'edit',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimStart',
				returnType: 'string',
			},
		},
	},
};
