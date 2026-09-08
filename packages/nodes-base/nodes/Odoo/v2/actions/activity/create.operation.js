import { NodeOperationError } from 'n8n-workflow';
import { recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';
const properties = [
    {
        displayName: 'Linked Document Model',
        name: 'res_model',
        type: 'resourceLocator',
        default: { mode: 'list', value: '' },
        required: true,
        description: 'The Odoo model of the document to attach the activity to',
        modes: [
            {
                displayName: 'From List',
                name: 'list',
                type: 'list',
                typeOptions: { searchListMethod: 'searchModels', searchable: true },
            },
            {
                displayName: 'By Name',
                name: 'id',
                type: 'string',
                placeholder: 'e.g. res.partner',
                validation: [
                    {
                        type: 'regex',
                        properties: { regex: '[a-z][a-z0-9_.]*', errorMessage: 'Not a valid Odoo model name' },
                    },
                ],
            },
        ],
    },
    {
        ...recordRLC('Linked Document', 'res_id', 'searchModelRecords', 'Record to attach the activity to'),
        typeOptions: { loadOptionsDependsOn: ['res_model.value'] },
    },
    recordRLC('Activity Type', 'activity_type_id', 'searchActivityTypes', 'Type of activity to schedule'),
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'resourceMapper',
        default: { mappingMode: 'defineBelow', value: null },
        noDataExpression: true,
        typeOptions: {
            loadOptionsDependsOn: ['resource', 'operation'],
            resourceMapper: {
                resourceMapperMethod: 'getActivityFields',
                mode: 'add',
                fieldWords: { singular: 'field', plural: 'fields' },
                addAllFields: false,
            },
        },
    },
];
const displayOptions = {
    show: { resource: ['activity'], operation: ['create'] },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const res_model = this.getNodeParameter('res_model', i, undefined, {
                extractValue: true,
            });
            const res_id = Number(this.getNodeParameter('res_id', i, undefined, {
                extractValue: true,
            }));
            const activity_type_id = Number(this.getNodeParameter('activity_type_id', i, undefined, {
                extractValue: true,
            }));
            const mappingMode = this.getNodeParameter('additionalFields.mappingMode', i);
            let additionalFlat;
            if (mappingMode === 'autoMapInputData') {
                additionalFlat = items[i].json;
            }
            else {
                additionalFlat = this.getNodeParameter('additionalFields.value', i, {});
            }
            // mail.activity.res_model_id is a Many2one to ir.model (res_model is computed from it).
            // The external API ignores res_model (char) — we must send res_model_id (integer).
            const modelRecords = (await odooApiRequest.call(this, 'ir.model', 'search_read', {
                domain: [['model', '=', res_model]],
                fields: ['id'],
                limit: 1,
                offset: 0,
            }));
            const res_model_id = modelRecords[0]?.id;
            if (res_model_id === undefined) {
                throw new NodeOperationError(this.getNode(), `Linked document model "${res_model}" was not found`, {
                    itemIndex: i,
                });
            }
            // Explicit RLC fields take precedence over anything set via the RMC
            const fields = { ...additionalFlat, res_model_id, res_id, activity_type_id };
            const result = (await odooApiRequest.call(this, 'mail.activity', 'create', {
                vals_list: [fields],
            }));
            const id = Array.isArray(result) ? result[0] : result;
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ id }), { itemData: { item: i } });
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
//# sourceMappingURL=create.operation.js.map