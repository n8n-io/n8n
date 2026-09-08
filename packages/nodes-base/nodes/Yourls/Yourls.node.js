import { NodeConnectionTypes, } from 'n8n-workflow';
import { yourlsApiRequest } from './GenericFunctions';
import { urlFields, urlOperations } from './UrlDescription';
export class Yourls {
    description = {
        displayName: 'Yourls',
        name: 'yourls',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:yourls.png',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Yourls API',
        defaults: {
            name: 'Yourls',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'yourlsApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                    },
                ],
                default: 'url',
            },
            ...urlOperations,
            ...urlFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'url') {
                    if (operation === 'shorten') {
                        const url = this.getNodeParameter('url', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        qs.url = url;
                        qs.action = 'shorturl';
                        Object.assign(qs, additionalFields);
                        responseData = await yourlsApiRequest.call(this, 'GET', {}, qs);
                    }
                    if (operation === 'expand') {
                        const shortUrl = this.getNodeParameter('shortUrl', i);
                        qs.shorturl = shortUrl;
                        qs.action = 'expand';
                        responseData = await yourlsApiRequest.call(this, 'GET', {}, qs);
                    }
                    if (operation === 'stats') {
                        const shortUrl = this.getNodeParameter('shortUrl', i);
                        qs.shorturl = shortUrl;
                        qs.action = 'url-stats';
                        responseData = await yourlsApiRequest.call(this, 'GET', {}, qs);
                        responseData = responseData.link;
                    }
                }
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
//# sourceMappingURL=Yourls.node.js.map