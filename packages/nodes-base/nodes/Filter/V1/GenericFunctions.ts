import moment from 'moment-timezone';
import type { INode, NodeParameterValue } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const isDateObject = (value: NodeParameterValue) =>
	Object.prototype.toString.call(value) === '[object Date]';

const isDateInvalid = (value: NodeParameterValue) => value?.toString() === 'Invalid Date';

export const compareOperationFunctions: {
	[key: string]: (value1: NodeParameterValue, value2: NodeParameterValue) => boolean;
} = {
	after: (value1: NodeParameterValue, value2: NodeParameterValue) => (value1 || 0) > (value2 || 0),
	before: (value1: NodeParameterValue, value2: NodeParameterValue) => (value1 || 0) < (value2 || 0),
	contains: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		(value1 || '').toString().includes((value2 || '').toString()),
	notContains: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		!(value1 || '').toString().includes((value2 || '').toString()),
	endsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		(value1 as string).endsWith(value2 as string),
	notEndsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		!(value1 as string).endsWith(value2 as string),
	equal: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 === value2,
	notEqual: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 !== value2,
	larger: (value1: NodeParameterValue, value2: NodeParameterValue) => (value1 || 0) > (value2 || 0),
	largerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		(value1 || 0) >= (value2 || 0),
	smaller: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		(value1 || 0) < (value2 || 0),
	smallerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		(value1 || 0) <= (value2 || 0),
	startsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		(value1 as string).startsWith(value2 as string),
	notStartsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
		!(value1 as string).startsWith(value2 as string),
	isEmpty: (value1: NodeParameterValue) =>
		[undefined, null, '', NaN].includes(value1 as string) ||
		(typeof value1 === 'object' && value1 !== null && !isDateObject(value1)
			? Object.entries(value1 as string).length === 0
			: false) ||
		(isDateObject(value1) && isDateInvalid(value1)),
	isNotEmpty: (value1: NodeParameterValue) =>
		!(
			[undefined, null, '', NaN].includes(value1 as string) ||
			(typeof value1 === 'object' && value1 !== null && !isDateObject(value1)
				? Object.entries(value1 as string).length === 0
				: false) ||
			(isDateObject(value1) && isDateInvalid(value1))
		),
	regex: (value1: NodeParameterValue, value2: NodeParameterValue) => {
		const regexMatch = (value2 || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));

		let regex: RegExp;
		if (!regexMatch) {
			regex = new RegExp((value2 || '').toString());
		} else if (regexMatch.length === 1) {
			regex = new RegExp(regexMatch[1]);
		} else {
			regex = new RegExp(regexMatch[1], regexMatch[2]);
		}

		return !!(value1 || '').toString().match(regex);
	},
	notRegex: (value1: NodeParameterValue, value2: NodeParameterValue) => {
		const regexMatch = (value2 || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));

		let regex: RegExp;
		if (!regexMatch) {
			regex = new RegExp((value2 || '').toString());
		} else if (regexMatch.length === 1) {
			regex = new RegExp(regexMatch[1]);
		} else {
			regex = new RegExp(regexMatch[1], regexMatch[2]);
		}

		return !(value1 || '').toString().match(regex);
	},
};

// Converts the input data of a dateTime into a number for easy compare
export const convertDateTime = (node: INode, value: NodeParameterValue): number => {
	let returnValue: number | undefined = undefined;
	if (typeof value === 'string') {
		returnValue = new Date(value).getTime();
	} else if (typeof value === 'number') {
		returnValue = value;
	}
	if (moment.isMoment(value)) {
		returnValue = value.unix();
	}
	if ((value as unknown as object) instanceof Date) {
		returnValue = (value as unknown as Date).getTime();
	}

	if (returnValue === undefined || isNaN(returnValue)) {
		throw new NodeOperationError(node, `The value "${value}" is not a valid DateTime.`);
	}

	return returnValue;
};
