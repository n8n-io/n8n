import { NodeConnectionTypes, } from 'n8n-workflow';
import { callFields, callOperations, userFields, userOperations } from './descriptions';
import { gongApiRequest } from './GenericFunctions';
export class Gong {
    description = {
        displayName: 'Gong',
        name: 'gong',
        icon: 'file:gong.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Interact with Gong API',
        defaults: {
            name: 'Gong',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'gongApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['accessToken'],
                    },
                },
            },
            {
                name: 'gongOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['oAuth2'],
                    },
                },
            },
        ],
        requestDefaults: {
            baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
        },
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Access Token',
                        value: 'accessToken',
                    },
                    {
                        name: 'OAuth2',
                        value: 'oAuth2',
                    },
                ],
                default: 'accessToken',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Call',
                        value: 'call',
                    },
                    {
                        name: 'User',
                        value: 'user',
                    },
                ],
                default: 'call',
            },
            ...callOperations,
            ...callFields,
            ...userOperations,
            ...userFields,
        ],
    };
    methods = {
        listSearch: {
            async getCalls(filter, paginationToken) {
                const query = {};
                if (paginationToken) {
                    query.cursor = paginationToken;
                }
                const responseData = await gongApiRequest.call(this, 'GET', '/v2/calls', {}, query);
                const calls = responseData.calls;
                const results = calls
                    .map((c) => ({
                    name: c.title,
                    value: c.id,
                }))
                    .filter((c) => !filter ||
                    c.name.toLowerCase().includes(filter.toLowerCase()) ||
                    c.value?.toString() === filter)
                    .sort((a, b) => {
                    if (a.name.toLowerCase() < b.name.toLowerCase())
                        return -1;
                    if (a.name.toLowerCase() > b.name.toLowerCase())
                        return 1;
                    return 0;
                });
                return { results, paginationToken: responseData.records.cursor };
            },
            async getUsers(filter, paginationToken) {
                const query = {};
                if (paginationToken) {
                    query.cursor = paginationToken;
                }
                const responseData = await gongApiRequest.call(this, 'GET', '/v2/users', {}, query);
                const users = responseData.users;
                const results = users
                    .map((u) => ({
                    name: `${u.firstName} ${u.lastName} (${u.emailAddress})`,
                    value: u.id,
                }))
                    .filter((u) => !filter ||
                    u.name.toLowerCase().includes(filter.toLowerCase()) ||
                    u.value?.toString() === filter)
                    .sort((a, b) => {
                    if (a.name.toLowerCase() < b.name.toLowerCase())
                        return -1;
                    if (a.name.toLowerCase() > b.name.toLowerCase())
                        return 1;
                    return 0;
                });
                return { results, paginationToken: responseData.records.cursor };
            },
        },
    };
}
//# sourceMappingURL=Gong.node.js.map