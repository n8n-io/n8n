import type { NativeDoc } from '@/Extensions/Extensions';

export const arrayMethods: NativeDoc = {
	typeName: 'Array',
	properties: {
		length: {
			doc: {
				name: 'length',
				description: 'Returns the number of elements in the Array.',
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
				description: 'Merges two or more arrays into one array.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat',
				returnType: 'Array',
				args: [
					{ name: 'arr1', type: 'Array' },
					{ name: 'arr2', type: 'Array' },
					{ name: '...' },
					{ name: 'arrN', type: 'Array' },
				],
			},
		},
		filter: {
			doc: {
				name: 'filter',
				description: 'Returns an array only containing the elements that pass the test `fn`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter',
				returnType: 'Array',
				args: [{ name: 'fn', type: 'Function' }],
			},
		},
		find: {
			doc: {
				name: 'find',
				description:
					'Returns the first element in the provided array that passes the test `fn`. If no values satisfy the testing function, `undefined` is returned.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find',
				returnType: 'Array|undefined',
				args: [{ name: 'fn', type: 'Function' }],
			},
		},
		findIndex: {
			doc: {
				name: 'findIndex',
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
				description: 'Returns the value of the last element that passes the test `fn`.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast',
				returnType: 'Element|undefined',
				args: [{ name: 'fn', type: 'Function' }],
			},
		},
		findLastIndex: {
			doc: {
				name: 'findLastIndex',
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
					'Returns the first index at which a given element can be found in the array, or -1 if it is not present.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf',
				returnType: 'number',
				args: [
					{ name: 'searchElement', type: 'string|number' },
					{ name: 'fromIndex?', type: 'number' },
				],
			},
		},
		includes: {
			doc: {
				name: 'includes',
				description: 'Checks if an array includes a certain value among its entries.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes',
				returnType: 'boolean',
				args: [
					{ name: 'searchElement', type: 'Element' },
					{ name: 'fromIndex?', type: 'number' },
				],
			},
		},
		join: {
			doc: {
				name: 'join',
				description:
					'Returns a string that concatenates all of the elements in an array, separated by `separator`, which defaults to comma.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join',
				returnType: 'Array',
				args: [{ name: 'separator?', type: 'string' }],
			},
		},
		map: {
			doc: {
				name: 'map',
				description: 'Returns an array containing the results of calling `fn` on every element.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
				returnType: 'Array',
				args: [{ name: 'fn', type: 'Function' }],
			},
		},
		reverse: {
			doc: {
				name: 'reverse',
				description:
					'Reverses an array and returns it. The first array element now becomes the last, and the last array element becomes the first.',
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
				args: [{ name: 'fn', type: 'Function' }],
			},
		},
		slice: {
			doc: {
				name: 'slice',
				description:
					'Returns a section of an Array. `end` defaults to the length of the Array if not given.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice',
				returnType: 'Array',
				args: [
					{ name: 'start', type: 'number' },
					{ name: 'end?', type: 'number' },
				],
			},
		},
		sort: {
			doc: {
				name: 'sort',
				description:
					'Returns a sorted array. The default sort order is ascending, built upon converting the elements into strings.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort',
				returnType: 'Array',
				args: [{ name: 'fn?', type: 'Function' }],
			},
		},
		splice: {
			doc: {
				name: 'splice',
				description: 'Changes the contents of an array by removing or replacing existing elements.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice',
				returnType: 'Array',
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
				description: 'Returns a string representing the specified array and its elements.',
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toString',
				returnType: 'string',
			},
		},
	},
};
