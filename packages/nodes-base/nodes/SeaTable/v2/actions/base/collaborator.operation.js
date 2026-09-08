import { updateDisplayOptions, } from 'n8n-workflow';
import { seaTableApiRequest } from '../../GenericFunctions';
export const properties = [
    {
        displayName: 'Name or email of the collaborator',
        name: 'searchString',
        type: 'string',
        placeholder: 'Enter the name or the email or the collaborator',
        required: true,
        default: '',
        description: 'SeaTable identifies users with a unique username like 244b43hr6fy54bb4afa2c2cb7369d244@auth.local. Get this username from an email or the name of a collaborator.',
    },
];
const displayOptions = {
    show: {
        resource: ['base'],
        operation: ['collaborator'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const searchString = this.getNodeParameter('searchString', index);
    const collaboratorsResult = await seaTableApiRequest.call(this, {}, 'GET', '/api-gateway/api/v2/dtables/{{dtable_uuid}}/related-users/');
    const collaborators = collaboratorsResult.user_list || [];
    const data = collaborators.filter((col) => col.contact_email.includes(searchString) || col.name.includes(searchString));
    return this.helpers.returnJsonArray(data);
}
//# sourceMappingURL=collaborator.operation.js.map