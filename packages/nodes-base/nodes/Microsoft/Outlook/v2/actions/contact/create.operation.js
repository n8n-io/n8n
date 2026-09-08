import { updateDisplayOptions } from '@utils/utilities';
import { contactFields } from '../../descriptions';
import { prepareContactFields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    {
        displayName: 'First Name',
        name: 'givenName',
        type: 'string',
        default: '',
        required: true,
    },
    {
        displayName: 'Last Name',
        name: 'surname',
        type: 'string',
        default: '',
    },
    {
        displayName: 'Additional Fields',
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
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const additionalFields = this.getNodeParameter('additionalFields', index);
    const givenName = this.getNodeParameter('givenName', index);
    const surname = this.getNodeParameter('surname', index);
    const body = {
        givenName,
        ...prepareContactFields(additionalFields),
    };
    if (surname) {
        body.surname = surname;
    }
    const responseData = await microsoftApiRequest.call(this, 'POST', '/contacts', index, body);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=create.operation.js.map