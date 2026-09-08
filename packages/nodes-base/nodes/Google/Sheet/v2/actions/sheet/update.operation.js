import { NodeOperationError, UserError } from 'n8n-workflow';
import { cellFormat, handlingExtraData, locationDefine, upsertColumnsResourceMapperBuilderHint, } from './commonDescription';
import { ROW_NUMBER, } from '../../helpers/GoogleSheets.types';
import { cellFormatDefault, untilSheetSelected } from '../../helpers/GoogleSheets.utils';
export const description = [
    {
        displayName: 'Data Mode',
        name: 'dataMode',
        type: 'options',
        options: [
            {
                name: 'Auto-Map Input Data to Columns',
                value: 'autoMapInputData',
                description: 'Use when node input properties match destination column names',
            },
            {
                name: 'Map Each Column Below',
                value: 'defineBelow',
                description: 'Set the value for each destination column',
            },
            {
                name: 'Nothing',
                value: 'nothing',
                description: 'Do not send anything',
            },
        ],
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['update'],
                '@version': [3],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
        default: 'defineBelow',
        description: 'Whether to insert the input data this node receives in the new row',
    },
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
        displayName: 'Column to match on',
        name: 'columnToMatchOn',
        type: 'options',
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        typeOptions: {
            loadOptionsDependsOn: ['sheetName.value'],
            loadOptionsMethod: 'getSheetHeaderRowAndSkipEmpty',
        },
        default: '',
        hint: "Used to find the correct row to update. Doesn't get changed.",
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['update'],
                '@version': [3],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
    },
    {
        displayName: 'Value of Column to Match On',
        name: 'valueToMatchOn',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['update'],
                dataMode: ['defineBelow'],
                '@version': [3],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
    },
    {
        displayName: 'Values to Send',
        name: 'fieldsUi',
        placeholder: 'Add Field',
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['update'],
                dataMode: ['defineBelow'],
                '@version': [3],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
        default: {},
        options: [
            {
                displayName: 'Field',
                name: 'values',
                values: [
                    {
                        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
                        displayName: 'Column',
                        name: 'column',
                        type: 'options',
                        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                        typeOptions: {
                            loadOptionsDependsOn: ['sheetName.value', 'columnToMatchOn'],
                            loadOptionsMethod: 'getSheetHeaderRowAndAddColumn',
                        },
                        default: '',
                    },
                    {
                        displayName: 'Column Name',
                        name: 'columnName',
                        type: 'string',
                        default: '',
                        displayOptions: {
                            show: {
                                column: ['newColumn'],
                            },
                        },
                    },
                    {
                        displayName: 'Value',
                        name: 'fieldValue',
                        type: 'string',
                        default: '',
                    },
                ],
            },
        ],
    },
    {
        displayName: 'Columns',
        name: 'columns',
        type: 'resourceMapper',
        noDataExpression: true,
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        required: true,
        builderHint: upsertColumnsResourceMapperBuilderHint,
        typeOptions: {
            loadOptionsDependsOn: ['sheetName.value'],
            resourceMapper: {
                resourceMapperMethod: 'getMappingColumns',
                mode: 'update',
                fieldWords: {
                    singular: 'column',
                    plural: 'columns',
                },
                addAllFields: true,
                multiKeyMatch: false,
                allowEmptyValues: true,
            },
        },
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['update'],
                '@version': [{ _cnd: { gte: 4.7 } }],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
    },
    {
        displayName: 'Columns',
        name: 'columns',
        type: 'resourceMapper',
        noDataExpression: true,
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        required: true,
        builderHint: upsertColumnsResourceMapperBuilderHint,
        typeOptions: {
            loadOptionsDependsOn: ['sheetName.value'],
            resourceMapper: {
                resourceMapperMethod: 'getMappingColumns',
                mode: 'update',
                fieldWords: {
                    singular: 'column',
                    plural: 'columns',
                },
                addAllFields: true,
                multiKeyMatch: false,
            },
        },
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['update'],
                '@version': [{ _cnd: { between: { from: 4, to: 4.6 } } }],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['update'],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
        options: [
            cellFormat,
            locationDefine,
            handlingExtraData,
            {
                ...handlingExtraData,
                displayOptions: { show: { '/columns.mappingMode': ['autoMapInputData'] } },
            },
        ],
    },
];
export async function execute(sheet, sheetName) {
    const items = this.getInputData();
    const nodeVersion = this.getNode().typeVersion;
    const range = `${sheetName}!A:Z`;
    const valueInputMode = this.getNodeParameter('options.cellFormat', 0, cellFormatDefault(nodeVersion));
    const options = this.getNodeParameter('options', 0, {});
    const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE');
    const locationDefineOptions = options.locationDefine?.values;
    let keyRowIndex = 0;
    let dataStartRowIndex = 1;
    if (locationDefineOptions) {
        if (locationDefineOptions.headerRow) {
            keyRowIndex = parseInt(locationDefineOptions.headerRow, 10) - 1;
        }
        if (locationDefineOptions.firstDataRow) {
            dataStartRowIndex = parseInt(locationDefineOptions.firstDataRow, 10) - 1;
        }
    }
    let columnNames = [];
    const sheetData = await sheet.getData(sheetName, 'FORMATTED_VALUE');
    if (sheetData?.[keyRowIndex] === undefined) {
        throw new NodeOperationError(this.getNode(), `Could not retrieve the column names from row ${keyRowIndex + 1}`);
    }
    columnNames = sheetData[keyRowIndex];
    const newColumns = new Set();
    const columnsToMatchOn = nodeVersion < 4 ? [this.getNodeParameter('columnToMatchOn', 0)] : [];
    if (nodeVersion >= 4) {
        // Use a fallback so the missing update key gets an operation-specific error.
        const matchingColumns = this.getNodeParameter('columns.matchingColumns', 0, []);
        if (!Array.isArray(matchingColumns) || matchingColumns.length === 0) {
            throw new NodeOperationError(this.getNode(), '`columns.matchingColumns` is required for the Update Row operation', {
                description: 'Set `columns.matchingColumns` to a non-empty `string[]` of header names that uniquely identify the row to update (e.g. `["id"]` or `["email"]`).',
            });
        }
        columnsToMatchOn.push(...matchingColumns);
    }
    const dataMode = nodeVersion < 4
        ? this.getNodeParameter('dataMode', 0)
        : this.getNodeParameter('columns.mappingMode', 0);
    // TODO: Add support for multiple columns to match on in the next overhaul
    const keyIndex = columnNames.indexOf(columnsToMatchOn[0]);
    //not used when updating row
    const columnValuesList = await sheet.getColumnValues({
        range,
        keyIndex,
        dataStartRowIndex,
        valueRenderMode,
        sheetData,
    });
    const updateData = [];
    const mappedValues = [];
    const errorOnUnexpectedColumn = (key, i) => {
        if (!columnNames.includes(key)) {
            throw new NodeOperationError(this.getNode(), 'Unexpected fields in node input', {
                itemIndex: i,
                description: `The input field '${key}' doesn't match any column in the Sheet. You can ignore this by changing the 'Handling extra data' field, which you can find under 'Options'.`,
            });
        }
    };
    const addNewColumn = (key) => {
        if (!columnNames.includes(key) && key !== ROW_NUMBER) {
            newColumns.add(key);
        }
    };
    for (let i = 0; i < items.length; i++) {
        if (dataMode === 'nothing')
            continue;
        const inputData = [];
        if (dataMode === 'autoMapInputData') {
            const handlingExtraDataOption = options.handlingExtraData || 'insertInNewColumn';
            if (handlingExtraDataOption === 'ignoreIt') {
                inputData.push(items[i].json);
            }
            if (handlingExtraDataOption === 'error') {
                Object.keys(items[i].json).forEach((key) => errorOnUnexpectedColumn(key, i));
                inputData.push(items[i].json);
            }
            if (handlingExtraDataOption === 'insertInNewColumn') {
                Object.keys(items[i].json).forEach(addNewColumn);
                inputData.push(items[i].json);
            }
        }
        else {
            const valueToMatchOn = nodeVersion < 4
                ? this.getNodeParameter('valueToMatchOn', i, '')
                : this.getNodeParameter(`columns.value["${columnsToMatchOn[0]}"]`, i, '');
            if (valueToMatchOn === '') {
                throw new NodeOperationError(this.getNode(), "The 'Column to Match On' parameter is required", {
                    itemIndex: i,
                });
            }
            if (nodeVersion < 4) {
                const valuesToSend = this.getNodeParameter('fieldsUi.values', i, []);
                if (!valuesToSend?.length) {
                    throw new NodeOperationError(this.getNode(), "At least one value has to be added under 'Values to Send'");
                }
                const fields = valuesToSend.reduce((acc, entry) => {
                    if (entry.column === 'newColumn') {
                        const columnName = entry.columnName;
                        if (!columnNames.includes(columnName)) {
                            newColumns.add(columnName);
                        }
                        acc[columnName] = entry.fieldValue;
                    }
                    else {
                        acc[entry.column] = entry.fieldValue;
                    }
                    return acc;
                }, {});
                fields[columnsToMatchOn[0]] = valueToMatchOn;
                inputData.push(fields);
            }
            else {
                const mappingValues = this.getNodeParameter('columns.value', i);
                if (Object.keys(mappingValues).length === 0) {
                    throw new NodeOperationError(this.getNode(), "At least one value has to be added under 'Values to Send'");
                }
                // Setting empty values to empty string so that they are not ignored by the API
                Object.keys(mappingValues).forEach((key) => {
                    // null and undefined values are mapped to undefined
                    if (key === 'row_number' && mappingValues[key] === undefined && nodeVersion >= 4.6) {
                        throw new UserError('row_number is null or undefined', {
                            description: "Since it's being used to determine the row to update, it cannot be null or undefined",
                        });
                    }
                    // null and undefined values are mapped to undefined
                    if (mappingValues[key] === undefined) {
                        this.addExecutionHints({
                            message: 'Warning: The value of column to match is null or undefined',
                            location: 'outputPane',
                        });
                    }
                    if (mappingValues[key] === undefined || mappingValues[key] === null) {
                        mappingValues[key] = '';
                    }
                });
                inputData.push(mappingValues);
                mappedValues.push(mappingValues);
            }
        }
        if (newColumns.size) {
            const newColumnNames = columnNames.concat([...newColumns]);
            await sheet.updateRows(sheetName, [newColumnNames], options.cellFormat || cellFormatDefault(nodeVersion), keyRowIndex + 1);
            columnNames = newColumnNames;
            newColumns.clear();
        }
        let preparedData;
        const columnNamesList = [columnNames.concat([...newColumns])];
        if (columnsToMatchOn[0] === 'row_number') {
            preparedData = sheet.prepareDataForUpdatingByRowNumber(inputData, range, columnNamesList);
        }
        else {
            const indexKey = columnsToMatchOn[0];
            preparedData = await sheet.prepareDataForUpdateOrUpsert({
                inputData,
                indexKey,
                range,
                keyRowIndex,
                dataStartRowIndex,
                valueRenderMode,
                columnNamesList,
                columnValuesList,
            });
        }
        updateData.push(...preparedData.updateData);
    }
    if (updateData.length) {
        await sheet.batchUpdate(updateData, valueInputMode);
    }
    if (nodeVersion < 4 || dataMode === 'autoMapInputData') {
        return items.map((item, index) => {
            item.pairedItem = { item: index };
            return item;
        });
    }
    else {
        if (!updateData.length) {
            return [];
        }
        const returnData = [];
        for (const [index, entry] of mappedValues.entries()) {
            returnData.push({
                json: entry,
                pairedItem: { item: index },
            });
        }
        return returnData;
    }
}
//# sourceMappingURL=update.operation.js.map