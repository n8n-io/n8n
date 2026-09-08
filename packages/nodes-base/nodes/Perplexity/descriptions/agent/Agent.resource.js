import { agentErrorPostReceive } from '../../GenericFunctions';
import * as createResponse from './createResponse.operation';
export const description = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['agent'],
            },
        },
        options: [
            {
                name: 'Create Response',
                value: 'createResponse',
                action: 'Create a response',
                description: 'Create a response using the Agent API with third-party models, presets, and tools',
                routing: {
                    request: {
                        method: 'POST',
                        url: '/v1/agent',
                    },
                    output: {
                        postReceive: [agentErrorPostReceive],
                    },
                },
            },
        ],
        default: 'createResponse',
    },
    ...createResponse.description,
];
//# sourceMappingURL=Agent.resource.js.map