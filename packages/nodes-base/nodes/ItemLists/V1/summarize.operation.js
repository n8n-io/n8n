import get from 'lodash/get';
import { NodeOperationError } from 'n8n-workflow';
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
const NUMERICAL_AGGREGATIONS = ['average', 'max', 'min', 'sum'];
export const description = [
    {
        displayName: 'Fields to Summarize',
        name: 'fieldsToSummarize',
        type: 'fixedCollection',
        placeholder: 'Add Field',
        default: { values: [{ aggregation: 'count', field: '' }] },
        typeOptions: {
            multipleValues: true,
        },
        options: [
            {
                displayName: '',
                name: 'values',
                values: [
                    {
                        displayName: 'Aggregation',
                        name: 'aggregation',
                        type: 'options',
                        options: [
                            {
                                name: 'Append',
                                value: 'append',
                            },
                            {
                                name: 'Average',
                                value: 'average',
                            },
                            {
                                name: 'Concatenate',
                                value: 'concatenate',
                            },
                            {
                                name: 'Count',
                                value: 'count',
                            },
                            {
                                name: 'Count Unique',
                                value: 'countUnique',
                            },
                            {
                                name: 'Max',
                                value: 'max',
                            },
                            {
                                name: 'Min',
                                value: 'min',
                            },
                            {
                                name: 'Sum',
                                value: 'sum',
                            },
                        ],
                        default: 'count',
                        description: 'How to combine the values of the field you want to summarize',
                    },
                    //field repeated to have different descriptions for different aggregations --------------------------------
                    {
                        displayName: 'Field',
                        name: 'field',
                        type: 'string',
                        default: '',
                        description: 'The name of an input field that you want to summarize',
                        placeholder: 'e.g. cost',
                        hint: ' Enter the field name as text',
                        displayOptions: {
                            hide: {
                                aggregation: [...NUMERICAL_AGGREGATIONS, 'countUnique', 'count'],
                            },
                        },
                        requiresDataPath: 'single',
                    },
                    {
                        displayName: 'Field',
                        name: 'field',
                        type: 'string',
                        default: '',
                        description: 'The name of an input field that you want to summarize. The field should contain numerical values; null, undefined, empty strings would be ignored.',
                        placeholder: 'e.g. cost',
                        hint: ' Enter the field name as text',
                        displayOptions: {
                            show: {
                                aggregation: NUMERICAL_AGGREGATIONS,
                            },
                        },
                        requiresDataPath: 'single',
                    },
                    {
                        displayName: 'Field',
                        name: 'field',
                        type: 'string',
                        default: '',
                        description: 'The name of an input field that you want to summarize; null, undefined, empty strings would be ignored',
                        placeholder: 'e.g. cost',
                        hint: ' Enter the field name as text',
                        displayOptions: {
                            show: {
                                aggregation: ['countUnique', 'count'],
                            },
                        },
                        requiresDataPath: 'single',
                    },
                    // ----------------------------------------------------------------------------------------------------------
                    {
                        displayName: 'Include Empty Values',
                        name: 'includeEmpty',
                        type: 'boolean',
                        default: false,
                        displayOptions: {
                            show: {
                                aggregation: ['append', 'concatenate'],
                            },
                        },
                    },
                    {
                        displayName: 'Separator',
                        name: 'separateBy',
                        type: 'options',
                        default: ',',
                        // eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
                        options: [
                            {
                                name: 'Comma',
                                value: ',',
                            },
                            {
                                name: 'Comma and Space',
                                value: ', ',
                            },
                            {
                                name: 'New Line',
                                value: '\n',
                            },
                            {
                                name: 'None',
                                value: '',
                            },
                            {
                                name: 'Space',
                                value: ' ',
                            },
                            {
                                name: 'Other',
                                value: 'other',
                            },
                        ],
                        hint: 'What to insert between values',
                        displayOptions: {
                            show: {
                                aggregation: ['concatenate'],
                            },
                        },
                    },
                    {
                        displayName: 'Custom Separator',
                        name: 'customSeparator',
                        type: 'string',
                        default: '',
                        displayOptions: {
                            show: {
                                aggregation: ['concatenate'],
                                separateBy: ['other'],
                            },
                        },
                    },
                ],
            },
        ],
        displayOptions: {
            show: {
                resource: ['itemList'],
                operation: ['summarize'],
            },
        },
    },
    // fieldsToSplitBy repeated to have different displayName for singleItem and separateItems -----------------------------
    {
        displayName: 'Fields to Split By',
        name: 'fieldsToSplitBy',
        type: 'string',
        placeholder: 'e.g. country, city',
        default: '',
        description: 'The name of the input fields that you want to split the summary by',
        hint: 'Enter the name of the fields as text (separated by commas)',
        displayOptions: {
            show: {
                resource: ['itemList'],
                operation: ['summarize'],
            },
            hide: {
                '/options.outputFormat': ['singleItem'],
            },
        },
        requiresDataPath: 'multiple',
    },
    {
        displayName: 'Fields to Group By',
        name: 'fieldsToSplitBy',
        type: 'string',
        placeholder: 'e.g. country, city',
        default: '',
        description: 'The name of the input fields that you want to split the summary by',
        hint: 'Enter the name of the fields as text (separated by commas)',
        displayOptions: {
            show: {
                resource: ['itemList'],
                operation: ['summarize'],
                '/options.outputFormat': ['singleItem'],
            },
        },
        requiresDataPath: 'multiple',
    },
    // ----------------------------------------------------------------------------------------------------------
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
            show: {
                resource: ['itemList'],
                operation: ['summarize'],
            },
        },
        options: [
            {
                displayName: 'Disable Dot Notation',
                name: 'disableDotNotation',
                type: 'boolean',
                default: false,
                description: 'Whether to disallow referencing child fields using `parent.child` in the field name',
            },
            {
                displayName: 'Output Format',
                name: 'outputFormat',
                type: 'options',
                default: 'separateItems',
                options: [
                    {
                        name: 'Each Split in a Separate Item',
                        value: 'separateItems',
                    },
                    {
                        name: 'All Splits in a Single Item',
                        value: 'singleItem',
                    },
                ],
            },
            {
                // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
                displayName: 'Ignore items without valid fields to group by',
                name: 'skipEmptySplitFields',
                type: 'boolean',
                default: false,
            },
        ],
    },
];
function isEmpty(value) {
    return value === undefined || value === null || value === '';
}
const fieldValueGetter = (disableDotNotation) => {
    if (disableDotNotation) {
        return (item, field) => item[field];
    }
    else {
        return (item, field) => get(item, field);
    }
};
function checkIfFieldExists(items, aggregations, getValue) {
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
        case 'min':
            return Math.min(...data.map((item) => {
                return getValue(item, field);
            }));
        case 'max':
            return Math.max(...data.map((item) => {
                return getValue(item, field);
            }));
        //count operations
        case 'countUnique':
            return new Set(data.map((item) => getValue(item, field)).filter((item) => !isEmpty(item)))
                .size;
        default:
            //count by default
            return data.filter((item) => !isEmpty(getValue(item, field))).length;
    }
}
function aggregateData(data, fieldsToSummarize, options, getValue) {
    const returnData = fieldsToSummarize.reduce((acc, aggregation) => {
        acc[`${AggregationDisplayNames[aggregation.aggregation]}${aggregation.field}`] = aggregate(data, aggregation, getValue);
        return acc;
    }, {});
    if (options.outputFormat === 'singleItem') {
        return returnData;
    }
    else {
        return { ...returnData, pairedItems: data.map((item) => item._itemIndex) };
    }
}
function splitData(splitKeys, data, fieldsToSummarize, options, getValue) {
    if (!splitKeys || splitKeys.length === 0) {
        return aggregateData(data, fieldsToSummarize, options, getValue);
    }
    const [firstSplitKey, ...restSplitKeys] = splitKeys;
    const groupedData = data.reduce((acc, item) => {
        let keyValuee = getValue(item, firstSplitKey);
        if (typeof keyValuee === 'object') {
            keyValuee = JSON.stringify(keyValuee);
        }
        if (options.skipEmptySplitFields && typeof keyValuee !== 'number' && !keyValuee) {
            return acc;
        }
        if (acc[keyValuee] === undefined) {
            acc[keyValuee] = [item];
        }
        else {
            acc[keyValuee].push(item);
        }
        return acc;
    }, {});
    return Object.keys(groupedData).reduce((acc, key) => {
        const value = groupedData[key];
        acc[key] = splitData(restSplitKeys, value, fieldsToSummarize, options, getValue);
        return acc;
    }, {});
}
function aggregationToArray(aggregationResult, fieldsToSplitBy, previousStage = {}) {
    const returnData = [];
    const splitFieldName = fieldsToSplitBy[0];
    const isNext = fieldsToSplitBy[1];
    if (isNext === undefined) {
        for (const fieldName of Object.keys(aggregationResult)) {
            returnData.push({
                ...previousStage,
                [splitFieldName]: fieldName,
                ...aggregationResult[fieldName],
            });
        }
        return returnData;
    }
    else {
        for (const key of Object.keys(aggregationResult)) {
            returnData.push(...aggregationToArray(aggregationResult[key], fieldsToSplitBy.slice(1), {
                ...previousStage,
                [splitFieldName]: key,
            }));
        }
        return returnData;
    }
}
export async function execute(items) {
    const newItems = items.map(({ json }, i) => ({ ...json, _itemIndex: i }));
    const options = this.getNodeParameter('options', 0, {});
    const fieldsToSplitBy = this.getNodeParameter('fieldsToSplitBy', 0, '')
        .split(',')
        .map((field) => field.trim())
        .filter((field) => field);
    const fieldsToSummarize = this.getNodeParameter('fieldsToSummarize.values', 0, []);
    if (fieldsToSummarize.filter((aggregation) => aggregation.field !== '').length === 0) {
        throw new NodeOperationError(this.getNode(), "You need to add at least one aggregation to 'Fields to Summarize' with non empty 'Field'");
    }
    const getValue = fieldValueGetter(options.disableDotNotation);
    checkIfFieldExists.call(this, newItems, fieldsToSummarize, getValue);
    const aggregationResult = splitData(fieldsToSplitBy, newItems, fieldsToSummarize, options, getValue);
    if (options.outputFormat === 'singleItem') {
        const executionData = {
            json: aggregationResult,
            pairedItem: newItems.map((_v, index) => ({
                item: index,
            })),
        };
        return [[executionData]];
    }
    else {
        if (!fieldsToSplitBy.length) {
            const { pairedItems, ...json } = aggregationResult;
            const executionData = {
                json,
                pairedItem: (pairedItems || []).map((index) => ({
                    item: index,
                })),
            };
            return [[executionData]];
        }
        const returnData = aggregationToArray(aggregationResult, fieldsToSplitBy);
        const executionData = returnData.map((item) => {
            const { pairedItems, ...json } = item;
            return {
                json,
                pairedItem: (pairedItems || []).map((index) => ({
                    item: index,
                })),
            };
        });
        return [executionData];
    }
}
//# sourceMappingURL=summarize.operation.js.map