import { ExpressionExtensionError } from '..';
import { average } from './ArrayExtensions';

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

export const extendedFunctions = {
	min,
	max,
	average,
	numberList,
	zip,
};
