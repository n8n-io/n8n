import { recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';
const properties = [
    recordRLC('Record', 'recordId', 'searchCustomRecords', 'Record to update', [
        'customResource.value',
    ]),
    {
        displayName: 'Fields to Update',
        name: 'fieldsToSend',
        type: 'resourceMapper',
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        noDataExpression: true,
        typeOptions: {
            loadOptionsDependsOn: ['resource', 'operation', 'customResource.value'],
            resourceMapper: {
                resourceMapperMethod: 'getOdooFields',
                mode: 'update',
                fieldWords: {
                    singular: 'field',
                    plural: 'fields',
                },
                addAllFields: false,
            },
        },
    },
];
const displayOptions = {
    show: { resource: ['custom'], operation: ['update'] },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const model = this.getNodeParameter('customResource', i, undefined, {
                extractValue: true,
            });
            const recordId = Number(this.getNodeParameter('recordId', i, undefined, {
                extractValue: true,
            }));
            const mappingMode = this.getNodeParameter('fieldsToSend.mappingMode', i);
            let vals;
            if (mappingMode === 'autoMapInputData') {
                vals = items[i].json;
            }
            else {
                vals = this.getNodeParameter('fieldsToSend.value', i, {});
            }
            await odooApiRequest.call(this, model, 'write', {
                ids: [recordId],
                vals,
            });
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ id: recordId, updated: true }), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                returnData.push(...executionData);
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=update.operation.js.map