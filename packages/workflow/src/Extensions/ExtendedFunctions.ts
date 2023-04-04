import { ExpressionExtensionError } from '../ExpressionError';
import { average as aAverage } from './ArrayExtensions';

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
};
