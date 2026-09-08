import { odooApiRequest } from '../../transport';
import { buildDomain } from '../../helpers/utils';
import { updateDisplayOptions } from '../../../../../utils/utilities';
const properties = [
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        default: false,
        description: 'Whether to return all results or only up to a given limit',
    },
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 50,
        displayOptions: { show: { returnAll: [false] } },
        typeOptions: { minValue: 1, maxValue: 1000 },
        description: 'Max number of results to return',
    },
    {
        displayName: 'Filters',
        name: 'filters',
        type: 'fixedCollection',
        default: {},
        placeholder: 'Add Filter',
        typeOptions: { multipleValues: true },
        options: [
            {
                name: 'filter',
                displayName: 'Filter',
                values: [
                    {
                        displayName: 'Field Name or ID',
                        name: 'fieldName',
                        type: 'options',
                        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                        default: '',
                        typeOptions: { loadOptionsMethod: 'getOpportunityFields' },
                    },
                    {
                        displayName: 'Operator',
                        name: 'operator',
                        type: 'options',
                        default: 'equal',
                        // eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
                        options: [
                            { name: 'Equal', value: 'equal' },
                            { name: 'Not Equal', value: 'notEqual' },
                            { name: 'Greater Than', value: 'greaterThen' },
                            { name: 'Less Than', value: 'lesserThen' },
                            { name: 'Greater or Equal', value: 'greaterOrEqual' },
                            { name: 'Less or Equal', value: 'lesserOrEqual' },
                            { name: 'Like', value: 'like' },
                            { name: 'In', value: 'in' },
                            { name: 'Not In', value: 'notIn' },
                            { name: 'Child Of', value: 'childOf' },
                        ],
                    },
                    { displayName: 'Value', name: 'value', type: 'string', default: '' },
                ],
            },
        ],
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        default: {},
        placeholder: 'Add Option',
        options: [
            {
                displayName: 'Fields to Include',
                name: 'fieldsList',
                type: 'multiOptions',
                description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                default: [],
                typeOptions: { loadOptionsMethod: 'getOpportunityFields' },
            },
        ],
    },
];
const displayOptions = {
    show: { resource: ['opportunity'], operation: ['getAll'] },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const returnAll = this.getNodeParameter('returnAll', i);
            const filters = this.getNodeParameter('filters', i);
            const options = this.getNodeParameter('options', i);
            const fields = options.fieldsList || [];
            const domain = buildDomain(filters);
            // Omit limit entirely when returnAll — sending limit=0 means SQL LIMIT 0 (zero rows).
            // Odoo's default limit=None means no limit.
            const body = { domain, fields, offset: 0 };
            if (!returnAll)
                body.limit = this.getNodeParameter('limit', i);
            const response = (await odooApiRequest.call(this, 'crm.lead', 'search_read', body));
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response), { itemData: { item: i } });
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
//# sourceMappingURL=getAll.operation.js.map