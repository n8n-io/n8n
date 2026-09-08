import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';
import { DataToSendOption, RowCreateUpdateOptions } from './create_update.description';
import { JSONSafeParse } from '../../helpers';
import { apiRequest } from '../../transport';
export const description = updateDisplayOptions({
    show: {
        operation: ['update'],
    },
}, [
    ...DataToSendOption,
    {
        displayName: 'Row ID Value',
        name: 'id',
        type: 'string',
        default: '',
        required: true,
        description: 'The value of the ID field',
    },
    ...RowCreateUpdateOptions,
    {
        displayName: 'Fields to Send',
        name: 'fieldsMapper',
        type: 'resourceMapper',
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        displayOptions: {
            show: {
                dataToSend: ['mapWithFields'],
            },
        },
        required: true,
        noDataExpression: true,
        typeOptions: {
            loadOptionsDependsOn: ['table.value'],
            resourceMapper: {
                resourceMapperMethod: 'getResourceMapperFields',
                mode: 'add',
                fieldWords: {
                    singular: 'column',
                    plural: 'columns',
                },
                addAllFields: true,
                supportAutoMap: false,
            },
        },
    },
]);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    let responseData;
    let requestMethod;
    let endPoint = '';
    const qs = {};
    const baseId = this.getNodeParameter('projectId', 0, undefined, {
        extractValue: true,
    });
    const table = this.getNodeParameter('table', 0, undefined, {
        extractValue: true,
    });
    let body = {};
    for (let i = 0; i < items.length; i++) {
        try {
            requestMethod = 'PATCH';
            endPoint = `/api/v3/data/${baseId}/${table}/records`;
            const id = this.getNodeParameter('id', i, undefined, {
                extractValue: true,
            });
            const newItem = { id, fields: {} };
            const dataToSend = this.getNodeParameter('dataToSend', i);
            if (dataToSend === 'autoMapInputData') {
                if (items[i].json.fields) {
                    const itemFields = items[i].json.fields;
                    const incomingKeys = Object.keys(itemFields);
                    const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                    const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                    for (const key of incomingKeys) {
                        if (inputDataToIgnore.includes(key))
                            continue;
                        if (key in itemFields) {
                            newItem.fields[key] = itemFields[key];
                        }
                    }
                }
            }
            else {
                const fields = this.getNodeParameter('fieldsMapper', i, []);
                if (fields?.value) {
                    for (const schema of fields.schema.filter((schema) => schema.type === 'array')) {
                        if (!fields.value[schema.id]) {
                            continue;
                        }
                        try {
                            fields.value[schema.id] = JSON.parse(fields.value[schema.id]);
                        }
                        catch {
                            fields.value[schema.id] = JSONSafeParse(fields.value[schema.id].replace(/'/g, '"'));
                        }
                    }
                    newItem.fields = fields?.value;
                }
            }
            body = [newItem]; // NocoDB v2/v3 create expects an array of objects
            responseData = await apiRequest.call(this, requestMethod, endPoint, body, qs);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData.records), { itemData: { item: i } });
            returnData.push.apply(returnData, executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.toString() }), { itemData: { item: i } });
                returnData.push.apply(returnData, executionData);
            }
            else {
                throw new NodeApiError(this.getNode(), error);
            }
        }
    }
    return [returnData];
}
//# sourceMappingURL=update.operation.js.map