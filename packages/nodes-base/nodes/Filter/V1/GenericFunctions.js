import moment from 'moment-timezone';
import { NodeOperationError, parseRegexLiteral, safeRegex } from 'n8n-workflow';
const isDateObject = (value) => Object.prototype.toString.call(value) === '[object Date]';
const isDateInvalid = (value) => value?.toString() === 'Invalid Date';
export function matchesRegex(value1, value2) {
    const { source, flags } = parseRegexLiteral((value2 || '').toString());
    return safeRegex.test(source, (value1 || '').toString(), flags);
}
export const compareOperationFunctions = {
    after: (value1, value2) => (value1 || 0) > (value2 || 0),
    before: (value1, value2) => (value1 || 0) < (value2 || 0),
    contains: (value1, value2) => (value1 || '').toString().includes((value2 || '').toString()),
    notContains: (value1, value2) => !(value1 || '').toString().includes((value2 || '').toString()),
    endsWith: (value1, value2) => value1.endsWith(value2),
    notEndsWith: (value1, value2) => !value1.endsWith(value2),
    equal: (value1, value2) => value1 === value2,
    notEqual: (value1, value2) => value1 !== value2,
    larger: (value1, value2) => (value1 || 0) > (value2 || 0),
    largerEqual: (value1, value2) => (value1 || 0) >= (value2 || 0),
    smaller: (value1, value2) => (value1 || 0) < (value2 || 0),
    smallerEqual: (value1, value2) => (value1 || 0) <= (value2 || 0),
    startsWith: (value1, value2) => value1.startsWith(value2),
    notStartsWith: (value1, value2) => !value1.startsWith(value2),
    isEmpty: (value1) => [undefined, null, '', NaN].includes(value1) ||
        (typeof value1 === 'object' && value1 !== null && !isDateObject(value1)
            ? Object.entries(value1).length === 0
            : false) ||
        (isDateObject(value1) && isDateInvalid(value1)),
    isNotEmpty: (value1) => !([undefined, null, '', NaN].includes(value1) ||
        (typeof value1 === 'object' && value1 !== null && !isDateObject(value1)
            ? Object.entries(value1).length === 0
            : false) ||
        (isDateObject(value1) && isDateInvalid(value1))),
    regex: matchesRegex,
    notRegex: (value1, value2) => !matchesRegex(value1, value2),
};
// Converts the input data of a dateTime into a number for easy compare
export const convertDateTime = (node, value) => {
    let returnValue = undefined;
    if (typeof value === 'string') {
        returnValue = new Date(value).getTime();
    }
    else if (typeof value === 'number') {
        returnValue = value;
    }
    if (moment.isMoment(value)) {
        returnValue = value.unix();
    }
    if (value instanceof Date) {
        returnValue = value.getTime();
    }
    if (returnValue === undefined || isNaN(returnValue)) {
        throw new NodeOperationError(node, `The value "${value}" is not a valid DateTime.`);
    }
    return returnValue;
};
//# sourceMappingURL=GenericFunctions.js.map