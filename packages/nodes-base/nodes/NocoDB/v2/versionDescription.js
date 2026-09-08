import { NodeConnectionTypes } from 'n8n-workflow';
import * as base from './actions/base/base.resource';
import * as linkrows from './actions/linkrows/linkrows.resource';
import * as rows from './actions/rows/rows.resource';
export const authentication = {
    displayName: 'Authentication',
    name: 'authentication',
    type: 'options',
    options: [
        {
            name: 'API Token',
            value: 'nocoDbApiToken',
        },
        {
            name: 'User Token',
            value: 'nocoDb',
        },
    ],
    default: 'nocoDb',
};
export const versionDescription = {
    displayName: 'NocoDB',
    name: 'nocoDb',
    icon: 'file:nocodb.svg',
    group: ['input'],
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Read, update, write and delete data from NocoDB',
    usableAsTool: true,
    defaults: {
        name: 'NocoDB',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    version: [4],
    credentials: [
        {
            name: 'nocoDb',
            required: true,
            displayOptions: {
                show: {
                    authentication: ['nocoDb'],
                },
            },
        },
        {
            name: 'nocoDbApiToken',
            required: true,
            displayOptions: {
                show: {
                    authentication: ['nocoDbApiToken'],
                },
            },
        },
    ],
    properties: [
        authentication,
        {
            displayName: 'Resource',
            name: 'resource',
            type: 'options',
            noDataExpression: true,
            options: [
                {
                    name: 'Row',
                    value: 'row',
                },
                {
                    name: 'Linked Row',
                    value: 'linkrow',
                },
                {
                    name: 'Base',
                    value: 'base',
                },
            ],
            default: 'row',
        },
        ...rows.description,
        ...base.description,
        ...linkrows.description,
    ],
};
//# sourceMappingURL=versionDescription.js.map