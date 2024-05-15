import type { NativeDoc } from '@/Extensions/Extensions';

export const arrayMethods: NativeDoc = {
	typeName: 'Array',
	properties: {
		length: {
			doc: {
				name: 'length',
				description: 'The number of elements in the array',
				examples: [{ example: "['Bob', 'Bill', 'Nat'].length", evaluated: '3' }],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/length',
				returnType: 'number',
			},
		},
	},
	functions: {
		concat: {
			doc: {
				name: 'concat',
				description: 'Joins one or more arrays onto the end of the base array',
				examples: [
					{
						example: "['Nathan', 'Jan'].concat(['Steve', 'Bill'])",
						evaluated: "['Nathan', 'Jan', 'Steve', 'Bill']",
					},
					{
						example: "[5, 4].concat([100, 101], ['a', 'b'])",
						evaluated: "[5, 4, 100, 101, 'a', 'b']",
					},
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat',
				returnType: 'Array',
				args: [
					{
						name: 'arrays',
						variadic: true,
						description: 'The arrays to be joined on the end of the base array, in order',
						type: 'Array',
					},
				],
			},
		},
		filter: {
			doc: {
				name: 'filter',
				description:
					'Returns an array with only the elements satisfying a condition. The condition is a function that returns <code>true</code> or <code>false</code>.',
				examples: [
					{
						example: '[12, 33, 16, 40].filter(age => age > 18)',
						evaluated: '[33, 40]',
						description: 'Keep ages over 18 (using arrow function notation)',
					},
					{
						example: "['Nathan', 'Bob', 'Sebastian'].filter(name => name.length < 5)",
						evaluated: "['Bob']",
						description: 'Keep names under 5 letters long (using arrow function notation)',
					},
					{
						example:
							"['Nathan', 'Bob', 'Sebastian'].filter(function(name) { return name.length < 5 })",
						evaluated: "['Bob']",
						description: 'Or using traditional function notation',
					},
					{
						example: '[1, 7, 3, 10, 5].filter((num, index) =>  index % 2 !== 0)',
						evaluated: '[7, 10]',
						description: 'Keep numbers at odd indexes',
					},
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter',
				returnType: 'Array',
				args: [
					{
						name: 'function',
						description:
							'A function to run for each array element. If it returns <code>true</code>, the element will be kept. Consider using <a target="_blank" href=”https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions”>arrow function notation</a> to save space.',
						type: 'Function',
						default: 'item => true',
						args: [
							{
								name: 'element',
								description: 'The value of the current element',
								type: 'any',
							},
							{
								name: 'index',
								optional: true,
								description: 'The position of the current element in the array (starting at 0)',
								type: 'number',
							},
							{
								name: 'array',
								optional: true,
								description: 'The array being processed. Rarely needed.',
								type: 'Array',
							},
							{
								name: 'thisValue',
								optional: true,
								description:
									'A value passed to the function as its <code>this</code> value. Rarely needed.',
								type: 'any',
							},
						],
					},
				],
			},
		},
		find: {
			doc: {
				name: 'find',
				description:
					'Returns the first element from the array that satisfies the provided condition. The condition is a function that returns <code>true</code> or <code>false</code>. Returns <code>undefined</code> if no matches are found.\n\nIf you need all matching elements, use <code>filter()</code>.',
				examples: [
					{
						example: '[12, 33, 16, 40].find(age => age > 18)',
						evaluated: '33',
						description: 'Find first age over 18 (using arrow function notation)',
					},
					{
						example: "['Nathan', 'Bob', 'Sebastian'].find(name => name.length < 5)",
						evaluated: "'Bob'",
						description: 'Find first name under 5 letters long (using arrow function notation)',
					},
					{
						example:
							"['Nathan', 'Bob', 'Sebastian'].find(function(name) { return name.length < 5 })",
						evaluated: "'Bob'",
						description: 'Or using traditional function notation',
					},
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find',
				returnType: 'Array | undefined',
				args: [
					{
						name: 'function',
						description:
							'A function to run for each array element. As soon as it returns <code>true</code>, that element will be returned. Consider using <a target="_blank" href=”https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions”>arrow function notation</a> to save space.',
						type: 'Function',
						default: 'item => true',
						args: [
							{
								name: 'element',
								description: 'The value of the current element',
								type: 'any',
							},
							{
								name: 'index',
								optional: true,
								description: 'The position of the current element in the array (starting at 0)',
								type: 'number',
							},
							{
								name: 'array',
								optional: true,
								description: 'The array being processed. Rarely needed.',
								type: 'Array',
							},
							{
								name: 'thisValue',
								optional: true,
								description:
									'A value passed to the function as its <code>this</code> value. Rarely needed.',
								type: 'any',
							},
						],
					},
				],
			},
		},
		findIndex: {
			doc: {
				name: 'findIndex',
				hidden: true,
				description:
					'Returns the index of the first element in an array that passes the test `fn`. If none are found, -1 is returned.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex',
				returnType: 'number',
				args: [{ name: 'fn', type: 'Function' }],
			},
		},
		findLast: {
			doc: {
				name: 'findLast',
				hidden: true,
				description: 'Returns the value of the last element that passes the test `fn`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast',
				returnType: 'any | undefined',
				args: [{ name: 'fn', type: 'Function' }],
			},
		},
		findLastIndex: {
			doc: {
				name: 'findLastIndex',
				hidden: true,
				description:
					'Returns the index of the last element that satisfies the provided testing function. If none are found, -1 is returned.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLastIndex',
				returnType: 'number',
				args: [{ name: 'fn', type: 'Function' }],
			},
		},
		indexOf: {
			doc: {
				name: 'indexOf',
				description:
					"Returns the position of the first matching element in the array, or -1 if the element isn't found. Positions start at 0.",
				examples: [
					{ example: "['Bob', 'Bill', 'Nat'].indexOf('Nat')", evaluated: '2' },
					{ example: "['Bob', 'Bill', 'Nat'].indexOf('Nathan')", evaluated: '-1' },
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf',
				returnType: 'number',
				args: [
					{
						name: 'element',
						description: 'The value to look for',
						type: 'any',
					},
					{
						name: 'start',
						optional: true,
						description: 'The index to start looking from',
						default: '0',
						type: 'number',
					},
				],
			},
		},
		includes: {
			doc: {
				name: 'includes',
				description: 'Returns <code>true</code> if the array contains the specified element',
				examples: [
					{ example: "['Bob', 'Bill', 'Nat'].indexOf('Nat')", evaluated: 'true' },
					{ example: "['Bob', 'Bill', 'Nat'].indexOf('Nathan')", evaluated: 'false' },
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes',
				returnType: 'boolean',
				args: [
					{
						name: 'element',
						description: 'The value to search the array for',
						type: 'any',
					},
					{
						name: 'start',
						optional: true,
						description: 'The index to start looking from',
						default: '0',
						type: 'number',
					},
				],
			},
		},
		join: {
			doc: {
				name: 'join',
				description:
					'Merges all elements of the array into a single string, with an optional separator between each element.\n\nThe opposite of <code>String.split()</code>.',
				examples: [
					{ example: "['Wind', 'Water', 'Fire'].join(' + ')", evaluated: "'Wind + Water + Fire'" },
					{ example: "['Wind', 'Water', 'Fire'].join()", evaluated: "'Wind,Water,Fire'" },
					{ example: "['Wind', 'Water', 'Fire'].join('')", evaluated: "'WindWaterFire'" },
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join',
				returnType: 'string',
				args: [
					{
						name: 'separator',
						optional: true,
						description: 'The character(s) to insert between each element',
						default: "','",
						type: 'string',
					},
				],
			},
		},
		map: {
			doc: {
				name: 'map',
				description:
					'Creates a new array by applying a function to each element of the original array',
				examples: [
					{
						example: '[12, 33, 16].map(num => num * 2)',
						evaluated: '[24, 66, 32]',
						description: 'Double all numbers (using arrow function notation)',
					},
					{
						example: "['hello', 'old', 'chap'].map(word => word.toUpperCase())",
						evaluated: "['HELLO', 'OLD', 'CHAP']]",
						description: 'Convert elements to uppercase (using arrow function notation)',
					},
					{
						example: "['hello', 'old', 'chap'].map(function(word) { return word.toUpperCase() })",
						evaluated: "['HELLO', 'OLD', 'CHAP']]",
						description: 'Or using traditional function notation',
					},
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
				returnType: 'Array',
				args: [
					{
						name: 'function',
						description:
							'A function to run for each array element. In the new array, the output of this function takes the place of the element. Consider using <a target="_blank" href=”https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions”>arrow function notation</a> to save space.',
						type: 'Function',
						default: 'item => item',
						args: [
							{
								name: 'element',
								description: 'The value of the current element',
								type: 'any',
							},
							{
								name: 'index',
								optional: true,
								description: 'The position of the current element in the array (starting at 0)',
								type: 'number',
							},
							{
								name: 'array',
								optional: true,
								description: 'The array being processed. Rarely needed.',
								type: 'Array',
							},
							{
								name: 'thisValue',
								optional: true,
								description:
									'A value passed to the function as its <code>this</code> value. Rarely needed.',
								type: 'any',
							},
						],
					},
				],
			},
		},
		reverse: {
			doc: {
				name: 'reverse',
				description: 'Reverses the order of the elements in the array',
				examples: [
					{ example: "['dog', 'bites', 'man'].reverse()", evaluated: "['man', 'bites', 'dog']" },
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse',
				returnType: 'Array',
			},
		},
		reduce: {
			doc: {
				name: 'reduce',
				description:
					'Executes a "reducer" function `fn` on each element of the array. Passing in the return value from the calculation on the preceding element. The final result of running the reducer across all elements of the array is a single value.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce',
				returnType: 'any',
				args: [
					{
						name: 'function',
						description:
							'A function to run for each array element. Takes the accumulated result and the current element, and returns a new accumulated result. Consider using <a target="_blank" href=”https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions”>arrow function notation</a> to save space.',
						type: 'Function',
						default: 'item => item',
						args: [
							{
								name: 'prevResult',
								description:
									'The accumulated result from applying the function to previous elements. When processing the first element, it’s set to <code>initResult</code> (or the first array element if not specified).',
								type: 'any',
							},
							{
								name: 'currentElem',
								description: 'The value in the array currently being processed',
								type: 'any',
							},
							{
								name: 'index',
								optional: true,
								description: 'The position of the current element in the array (starting at 0)',
								type: 'number',
							},
							{
								name: 'array',
								optional: true,
								description: 'The array being processed. Rarely needed.',
								type: 'Array',
							},
						],
					},
					{
						name: 'initResult',
						optional: true,
						description:
							"The initial value of the prevResult, used when calling the function on the first array element. When not specified it's set to the first array element, and the first function call is on the second array element instead of the first.",
						type: 'any',
					},
				],
			},
		},
		slice: {
			doc: {
				name: 'slice',
				description:
					'Returns a portion of the array, from the <code>start</code> index up to (but not including) the <code>end</code> index. Indexes start at 0.',
				examples: [
					{ example: '[1, 2, 3, 4, 5].slice(2, 4)', evaluated: '[3, 4]' },
					{ example: '[1, 2, 3, 4, 5].slice(2)', evaluated: '[3, 4, 5]' },
					{ example: '[1, 2, 3, 4, 5].slice(-2)', evaluated: '[4, 5]' },
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice',
				returnType: 'Array',
				args: [
					{
						name: 'start',
						optional: true,
						description:
							'The position to start from. Positions start at 0. Negative numbers count back from the end of the array.',
						default: '0',
						type: 'number',
					},
					{
						name: 'end',
						optional: true,
						description:
							'The position to select up to. The element at the end position is not included. Negative numbers select from the end of the array. If omitted, will extract to the end of the array.',
						type: 'number',
					},
				],
			},
		},
		sort: {
			doc: {
				name: 'sort',
				description:
					'Reorders the elements of the array. For sorting strings alphabetically, no parameter is required. For sorting numbers or Objects, see examples.',
				examples: [
					{
						example: "['d', 'a', 'c', 'b'].sort()",
						evaluated: "['a', 'b', 'c', 'd']",
						description: 'No need for a param when sorting strings',
					},
					{
						example: '[4, 2, 1, 3].sort((a, b) => (a - b))',
						evaluated: '[1, 2, 3, 4]',
						description: 'To sort numbers, you must use a function',
					},
					{
						example: '[4, 2, 1, 3].sort(function(a, b) { return a - b })',
						evaluated: '[1, 2, 3, 4]',
						description: 'Or using traditional function notation',
					},
					{ example: 'Sort in reverse alphabetical order' },
					{ example: "arr = ['d', 'a', 'c', 'b']" },
					{
						example: 'arr.sort((a, b) => b.localeCompare(a))',
						evaluated: "['d', 'c', 'b', 'a']",
						description: 'Sort in reverse alphabetical order',
					},
					{
						example:
							"[{name:'Zak'}, {name:'Abe'}, {name:'Bob'}].sort((a, b) => a.name.localeCompare(b.name))",
						evaluated: "[{name:'Abe'}, {name:'Bob'}, {name:'Zak'}]",
						description: 'Sort array of objects by a property',
					},
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort',
				returnType: 'Array',
				args: [
					{
						name: 'compare',
						optional: true,
						description:
							'A function to compare two array elements and return a number indicating which one comes first:\n<b>Return < 0</b>: <code>a</code> comes before <code>b</code>\n<b>Return 0</b>: <code>a</code> and <code>b</code> are equal (leave order unchanged)\n<b>Return > 0</b>: <code>b</code> comes before <code>a</code>\n\nIf no function is specified, converts all values to strings and compares their character codes.',
						default: '""',
						type: '(a, b) => number',
						args: [
							{
								name: 'a',
								description: 'The first element to compare in the function',
								type: 'any',
							},
							{
								name: 'b',
								description: 'The second element to compare in the function',
								type: 'any',
							},
						],
					},
				],
			},
		},
		splice: {
			doc: {
				name: 'splice',
				description: 'Changes the contents of an array by removing or replacing existing elements.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice',
				returnType: 'Array',
				hidden: true,
				args: [
					{ name: 'start', type: 'number' },
					{ name: 'deleteCount?', type: 'number' },
					{ name: 'item1?', type: 'Element' },
					{ name: '...' },
					{ name: 'itemN?', type: 'Element' },
				],
			},
		},
		toString: {
			doc: {
				name: 'toString',
				hidden: true,
				description: 'Returns a string representing the specified array and its elements.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toString',
				returnType: 'string',
			},
		},
		toSpliced: {
			doc: {
				name: 'toSpliced',
				description:
					'Adds and/or removes array elements at a given position. \n\nSee also <code>slice()</code> and <code>append()</code>.',
				examples: [
					{
						example: "['Jan', 'Mar'.toSpliced(1, 0, 'Feb')",
						evaluated: "['Jan', 'Feb', 'Mar']",
						description: 'Insert element at index 1',
					},
					{
						example: '["don\'t", "make", "me", "do", "this"].toSpliced(1, 2)',
						evaluated: '["don\'t", "do", "this"]',
						description: 'Delete 2 elements starting at index 1',
					},
					{
						example: '["don\'t", "be", "evil"].toSpliced(1, 2, "eat", "slugs")',
						evaluated: '["don\'t", "eat", "slugs"]',
						description: 'Replace 2 elements starting at index 1',
					},
				],
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSpliced',
				returnType: 'Array',
				args: [
					{
						name: 'start',
						description:
							'The index (position) to add or remove elements at.  New elements are inserted before the element at this index. A negative index counts back from the end of the array. ',
						type: 'number',
					},
					{
						name: 'deleteCount',
						optional: true,
						description:
							'The number of elements to remove. If omitted, removes all elements from the <code>start</code> index onwards.',
						type: 'number',
					},
					{
						name: 'elements',
						optional: true,
						variadic: true,
						description: 'The elements to be added, in order',
						type: 'any',
					},
				],
			},
		},
	},
};
