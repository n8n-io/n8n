import { updateDisplayOptions } from '../../../../../utils/utilities';
import { userRLC } from '../../helpers/descriptions';
import { formatFeed, populate } from '../../helpers/utils';
import { splunkApiRequest } from '../../transport';
const properties = [
    userRLC,
    {
        displayName: 'Update Fields',
        name: 'updateFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
            {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                placeholder: 'name@email.com',
                default: '',
            },
            {
                displayName: 'Full Name',
                name: 'realname',
                type: 'string',
                default: '',
                description: 'Full name of the user',
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: { password: true },
                default: '',
            },
            {
                displayName: 'Role Names or IDs',
                name: 'roles',
                type: 'multiOptions',
                description: 'Comma-separated list of roles to assign to the user. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                default: [],
                typeOptions: {
                    loadOptionsMethod: 'getRoles',
                },
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['user'],
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    // https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers.2F.7Bname.7D
    const body = {};
    const { roles, ...rest } = this.getNodeParameter('updateFields', i);
    populate({
        ...(roles && { roles }),
        ...rest,
    }, body);
    const userId = this.getNodeParameter('userId', i, '', { extractValue: true });
    const endpoint = `/services/authentication/users/${userId}`;
    const returnData = await splunkApiRequest.call(this, 'POST', endpoint, body).then(formatFeed);
    return returnData;
}
//# sourceMappingURL=update.operation.js.map