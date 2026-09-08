import { updateDisplayOptions } from '@utils/utilities';
import { contactFields, contactRLC } from '../../descriptions';
import { prepareContactFields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    contactRLC,
    {
        displayName: 'Update Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: contactFields,
    },
];
const displayOptions = {
    show: {
        resource: ['contact'],
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const additionalFields = this.getNodeParameter('additionalFields', index);
    const contactId = this.getNodeParameter('contactId', index, undefined, {
        extractValue: true,
    });
    const body = prepareContactFields(additionalFields);
    const responseData = await microsoftApiRequest.call(this, 'PATCH', `/contacts/${contactId}`, index, body);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=update.operation.js.map