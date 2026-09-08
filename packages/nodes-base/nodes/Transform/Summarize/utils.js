import get from 'lodash/get';
import { NodeOperationError, } from 'n8n-workflow';
const AggregationDisplayNames = {
    append: 'appended_',
    average: 'average_',
    concatenate: 'concatenated_',
    count: 'count_',
    countUnique: 'unique_count_',
    max: 'max_',
    min: 'min_',
    sum: 'sum_',
};
export const NUMERICAL_AGGREGATIONS = ['average', 'sum'];
function isEmpty(value) {
    return value === undefined || value === null || value === '';
}
function normalizeFieldName(fieldName) {
    return fieldName.replace(/[\]\["]/g, '').replace(/[ .]/g, '_');
}
export const fieldValueGetter = (disableDotNotation) => {
    return (item, field) => disableDotNotation ? item[field] : get(item, field);
};
export function checkIfFieldExists(items, aggregations, getValue) {
    for (const aggregation of aggregations) {
        if (aggregation.field === '') {
            continue;
        }
        const exist = items.some((item) => getValue(item, aggregation.field) !== undefined);
        if (!exist) {
            throw new NodeOperationError(this.getNode(), `The field '${aggregation.field}' does not exist in any items`);
        }
    }
}
function aggregate(items, entry, getValue) {
    const { aggregation, field } = entry;
    let data = [...items];
    if (NUMERICAL_AGGREGATIONS.includes(aggregation)) {
        data = data.filter((item) => typeof getValue(item, field) === 'number' && !isEmpty(getValue(item, field)));
    }
    switch (aggregation) {
        //combine operations
        case 'append':
            if (!entry.includeEmpty) {
                data = data.filter((item) => !isEmpty(getValue(item, field)));
            }
            return data.map((item) => getValue(item, field));
        case 'concatenate':
            const separateBy = entry.separateBy === 'other' ? entry.customSeparator : entry.separateBy;
            if (!entry.includeEmpty) {
                data = data.filter((item) => !isEmpty(getValue(item, field)));
            }
            return data
                .map((item) => {
                let value = getValue(item, field);
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                if (typeof value === 'undefined') {
                    value = 'undefined';
                }
                return value;
            })
                .join(separateBy);
        //numerical operations
        case 'average':
            return (data.reduce((acc, item) => {
                return acc + getValue(item, field);
            }, 0) / data.length);
        case 'sum':
            return data.reduce((acc, item) => {
                return acc + getValue(item, field);
            }, 0);
        //comparison operations
        case 'min':
            let min;
            for (const item of data) {
                const value = getValue(item, field);
                if (value !== undefined && value !== null && value !== '') {
                    if (min === undefined || value < min) {
                        min = value;
                    }
                }
            }
            return min ?? null;
        case 'max':
            let max;
            for (const item of data) {
                const value = getValue(item, field);
                if (value !== undefined && value !== null && value !== '') {
                    if (max === undefined || value > max) {
                        max = value;
                    }
                }
            }
            return max ?? null;
        //count operations
        case 'countUnique':
            if (!entry.includeEmpty) {
                return new Set(data.map((item) => getValue(item, field)).filter((item) => !isEmpty(item)))
                    .size;
            }
            return new Set(data.map((item) => getValue(item, field))).size;
        default:
            //count by default
            if (!entry.includeEmpty) {
                return data.filter((item) => !isEmpty(getValue(item, field))).length;
            }
            return data.length;
    }
}
function aggregateData(data, fieldsToSummarize, options, getValue) {
    const returnData = Object.fromEntries(fieldsToSummarize.map((aggregation) => {
        const key = normalizeFieldName(`${AggregationDisplayNames[aggregation.aggregation]}${aggregation.field}`);
        const result = aggregate(data, aggregation, getValue);
        return [key, result];
    }));
    if (options.outputFormat === 'singleItem') {
        return { returnData };
    }
    return { returnData, pairedItems: data.map((item) => item._itemIndex) };
}
// Using Map to preserve types
// With a plain JS object, keys are converted to string
export function aggregateAndSplitData({ splitKeys, inputItems, fieldsToSummarize, options, getValue, convertKeysToString = false, }) {
    if (!splitKeys?.length) {
        return aggregateData(inputItems, fieldsToSummarize, options, getValue);
    }
    const [firstSplitKey, ...restSplitKeys] = splitKeys;
    const groupedItems = new Map();
    for (const item of inputItems) {
        let splitValue = getValue(item, firstSplitKey);
        if (splitValue && typeof splitValue === 'object') {
            splitValue = JSON.stringify(splitValue);
        }
        if (convertKeysToString) {
            splitValue = String(splitValue);
        }
        if (options.skipEmptySplitFields && typeof splitValue !== 'number' && !splitValue) {
            continue;
        }
        const group = groupedItems.get(splitValue) ?? [];
        groupedItems.set(splitValue, group.concat([item]));
    }
    const splits = new Map(Array.from(groupedItems.entries()).map(([groupKey, items]) => [
        groupKey,
        aggregateAndSplitData({
            splitKeys: restSplitKeys,
            inputItems: items,
            fieldsToSummarize,
            options,
            getValue,
            convertKeysToString,
        }),
    ]));
    return { fieldName: firstSplitKey, splits };
}
export function flattenAggregationResultToObject(result) {
    if ('splits' in result) {
        return Object.fromEntries(Array.from(result.splits.entries()).map(([key, value]) => [
            key,
            flattenAggregationResultToObject(value),
        ]));
    }
    return result.returnData;
}
export function flattenAggregationResultToArray(result) {
    if ('splits' in result) {
        return Array.from(result.splits.entries()).flatMap(([value, innerResult]) => flattenAggregationResultToArray(innerResult).map((v) => {
            v.returnData[normalizeFieldName(result.fieldName)] = value;
            return v;
        }));
    }
    return [result];
}
//# sourceMappingURL=utils.js.map