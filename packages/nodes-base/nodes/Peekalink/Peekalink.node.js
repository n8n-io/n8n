import { Node, NodeApiError, NodeConnectionTypes, } from 'n8n-workflow';
export const apiUrl = 'https://api.peekalink.io';
export class Peekalink extends Node {
    description = {
        displayName: 'Peekalink',
        name: 'peekalink',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:peekalink.png',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"]',
        description: 'Consume the Peekalink API',
        defaults: {
            name: 'Peekalink',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'peekalinkApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Is Available',
                        value: 'isAvailable',
                        description: 'Check whether preview for a given link is available',
                        action: 'Check whether the preview for a given link is available',
                    },
                    {
                        name: 'Preview',
                        value: 'preview',
                        description: 'Return the preview for a link',
                        action: 'Return the preview for a link',
                    },
                ],
                default: 'preview',
            },
            {
                displayName: 'URL',
                name: 'url',
                type: 'string',
                default: '',
                required: true,
            },
        ],
    };
    async execute(context) {
        const items = context.getInputData();
        const operation = context.getNodeParameter('operation', 0);
        const returnData = await Promise.all(items.map(async (_, i) => {
            try {
                const link = context.getNodeParameter('url', i);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await context.helpers.requestWithAuthentication.call(context, 'peekalinkApi', {
                    method: 'POST',
                    uri: operation === 'preview' ? apiUrl : `${apiUrl}/is-available/`,
                    body: { link },
                    json: true,
                });
            }
            catch (error) {
                if (context.continueOnFail()) {
                    return { error: error.message };
                }
                throw new NodeApiError(context.getNode(), error);
            }
        }));
        return [context.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=Peekalink.node.js.map