import get from 'lodash/get';
import set from 'lodash/set';
import { UserError } from 'n8n-workflow';
export function splitAndTrim(str) {
    if (typeof str === 'string') {
        return str
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag);
    }
    return str;
}
// The "Analyzers" field is a multiOptions parameter, so it normally resolves to
// an array of "analyzerId::cortexId" entries. When its value comes from an
// expression wrapped in surrounding text/whitespace, n8n switches to string
// interpolation and the array is coerced to a comma-joined string. Normalize
// both shapes so the operation does not throw "(...).map is not a function".
export function parseAnalyzers(value) {
    return splitAndTrim(value).map((analyzer) => {
        const [analyzerId, cortexId] = analyzer.split('::');
        return { analyzerId, cortexId };
    });
}
export function fixFieldType(fields) {
    const returnData = {};
    for (const key of Object.keys(fields)) {
        if ([
            'date',
            'lastSyncDate',
            'startDate',
            'endDate',
            'dueDate',
            'includeInTimeline',
            'sightedAt',
        ].includes(key)) {
            returnData[key] = Date.parse(fields[key]);
            continue;
        }
        if (['tags', 'addTags', 'removeTags'].includes(key)) {
            returnData[key] = splitAndTrim(fields[key]);
            continue;
        }
        returnData[key] = fields[key];
    }
    return returnData;
}
export function prepareInputItem(item, schema, i) {
    const returnData = {};
    for (const entry of schema) {
        const id = entry.id;
        const value = get(item, id);
        if (value !== undefined) {
            set(returnData, id, value);
        }
        else {
            if (entry.required) {
                throw new UserError(`Required field "${id}" is missing in item ${i}`, {
                    level: 'warning',
                });
            }
        }
    }
    return returnData;
}
export function constructFilter(entry) {
    const { field, value } = entry;
    let { operator } = entry;
    if (operator === undefined) {
        operator = '_eq';
    }
    if (operator === '_between') {
        const { from, to } = entry;
        return {
            _between: {
                _field: field,
                _from: from,
                _to: to,
            },
        };
    }
    if (operator === '_in') {
        const { values } = entry;
        return {
            _in: {
                _field: field,
                _values: typeof values === 'string' ? splitAndTrim(values) : values,
            },
        };
    }
    return {
        [operator]: {
            _field: field,
            _value: value,
        },
    };
}
//# sourceMappingURL=utils.js.map