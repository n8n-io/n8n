import { updateDisplayOptions } from '@utils/utilities';
import { contactRLC } from '../../descriptions';
import { contactFields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    contactRLC,
    {
        displayName: 'Output',
        name: 'output',
        type: 'options',
        default: 'simple',
        options: [
            {
                name: 'Simplified',
                value: 'simple',
            },
            {
                name: 'Raw',
                value: 'raw',
            },
            {
                name: 'Select Included Fields',
                value: 'fields',
            },
        ],
    },
    {
        displayName: 'Fields',
        name: 'fields',
        type: 'multiOptions',
        description: 'The fields to add to the output',
        displayOptions: {
            show: {
                output: ['fields'],
            },
        },
        options: contactFields,
        default: [],
    },
];
const displayOptions = {
    show: {
        resource: ['contact'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const qs = {};
    const contactId = this.getNodeParameter('contactId', index, undefined, {
        extractValue: true,
    });
    const output = this.getNodeParameter('output', index);
    if (output === 'fields') {
        const fields = this.getNodeParameter('fields', index);
        qs.$select = fields.join(',');
    }
    if (output === 'simple') {
        qs.$select = 'id,displayName,emailAddresses,businessPhones,mobilePhone';
    }
    const responseData = await microsoftApiRequest.call(this, 'GET', `/contacts/${contactId}`, index, undefined, qs);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=get.operation.js.map