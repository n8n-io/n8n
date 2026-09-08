import { NodeConnectionTypes } from 'n8n-workflow';
import { uprocApiRequest } from './GenericFunctions';
import { groupOptions } from './GroupDescription';
import { toolOperations, toolParameters } from './ToolDescription';
export class UProc {
    description = {
        displayName: 'uProc',
        name: 'uproc',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:uproc.png',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["tool"]}}',
        description: 'Consume uProc API',
        defaults: {
            name: 'uProc',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'uprocApi',
                required: true,
            },
        ],
        properties: [
            ...groupOptions,
            ...toolOperations,
            ...toolParameters,
            {
                displayName: 'Additional Options',
                name: 'additionalOptions',
                type: 'collection',
                placeholder: 'Add option',
                default: {},
                displayOptions: {
                    show: {
                        group: [
                            'audio',
                            'communication',
                            'company',
                            'finance',
                            'geographic',
                            'image',
                            'internet',
                            'personal',
                            'product',
                            'security',
                            'text',
                        ],
                    },
                },
                options: [
                    {
                        displayName: 'Data Webhook',
                        name: 'dataWebhook',
                        type: 'string',
                        description: 'URL to send tool response when tool has resolved your request',
                        default: '',
                    },
                ],
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const group = this.getNodeParameter('group', 0);
        const tool = this.getNodeParameter('tool', 0);
        const additionalOptions = this.getNodeParameter('additionalOptions', 0);
        const dataWebhook = additionalOptions.dataWebhook;
        const fields = toolParameters
            .filter((field) => {
            return (field?.displayOptions?.show?.group &&
                field.displayOptions.show.tool &&
                field.displayOptions.show.group.indexOf(group) !== -1 &&
                field.displayOptions.show.tool.indexOf(tool) !== -1);
        })
            .map((field) => {
            return field.name;
        });
        for (let i = 0; i < length; i++) {
            try {
                const toolKey = tool.replace(/([A-Z]+)/g, '-$1').toLowerCase();
                const body = {
                    processor: toolKey,
                    params: {},
                };
                fields.forEach((field) => {
                    if (field?.length) {
                        const data = this.getNodeParameter(field, i);
                        body.params[field] = data + '';
                    }
                });
                if (dataWebhook?.length) {
                    body.callback = {};
                }
                if (dataWebhook?.length) {
                    body.callback.data = dataWebhook;
                }
                //Change to multiple requests
                responseData = await uprocApiRequest.call(this, 'POST', body);
                if (Array.isArray(responseData)) {
                    returnData.push.apply(returnData, responseData);
                }
                else {
                    returnData.push(responseData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });
                    continue;
                }
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=UProc.node.js.map