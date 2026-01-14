import { average as aAverage } from './array-extensions';
import { ExpressionExtensionError } from '../errors/expression-extension.error';
import { ExpressionError } from '../errors/expression.error';

const min = Math.min;
const max = Math.max;

const numberList = (start: number, end: number): number[] => {
	const size = Math.abs(start - end) + 1;
	const arr = new Array<number>(size);

	let curr = start;
	for (let i = 0; i < size; i++) {
		if (start < end) {
			arr[i] = curr++;
		} else {
			arr[i] = curr--;
		}
	}

	return arr;
};

const zip = (keys: unknown[], values: unknown[]): unknown => {
	if (keys.length !== values.length) {
		throw new ExpressionExtensionError('keys and values not of equal length');
	}
	return keys.reduce((p, c, i) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		(p as any)[c as any] = values[i];
		return p;
	}, {});
};

const average = (...args: number[]) => {
	return aAverage(args);
};

const not = (value: unknown): boolean => {
	return !value;
};

function ifEmpty<T, V>(value: V, defaultValue: T) {
	if (arguments.length !== 2) {
		throw new ExpressionError('expected two arguments (value, defaultValue) for this function');
	}
	if (value === undefined || value === null || value === '') {
		return defaultValue;
	}
	if (typeof value === 'object') {
		if (Array.isArray(value) && !value.length) {
			return defaultValue;
		}
		if (!Object.keys(value).length) {
			return defaultValue;
		}
	}
	return value;
}

ifEmpty.doc = {
	name: 'ifEmpty',
	description:
		'Returns the default value if the value is empty. Empty values are undefined, null, empty strings, arrays without elements and objects without keys.',
	returnType: 'any',
	args: [
		{ name: 'value', type: 'any' },
		{ name: 'defaultValue', type: 'any' },
	],
	docURL: 'https://docs.n8n.io/code/builtin/convenience',
};

function evaluateExpression(expression: string): any {
	if (arguments.length !== 1) {
		throw new ExpressionExtensionError('expected one argument (expression) for this function');
	}
	try {
		return new Function(`return (${expression});`)();
	} catch (err) {
		throw new ExpressionError(`Invalid expression: ${expression}`);
	}
}

evaluateExpression.doc = {
	name: 'evaluateExpression',
	description: 'Evaluates the given expression',
	returnType: 'any',
	args: [
		{
			name: 'expression',
			description: 'The expression to evaluate',
			type: 'string',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/convenience',
};

export const extendedFunctions = {
	min,
	max,
	not,
	average,
	numberList,
	zip,
	$min: min,
	$max: max,
	$average: average,
	$not: not,
	$ifEmpty: ifEmpty,
	$evaluateExpression: evaluateExpression,
};
