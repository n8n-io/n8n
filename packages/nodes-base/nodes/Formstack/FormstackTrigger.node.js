import { randomBytes } from 'crypto';
import { NodeConnectionTypes } from 'n8n-workflow';
import { verifySignature } from './FormstackTriggerHelpers';
import { apiRequest, getForms } from './GenericFunctions';
export class FormstackTrigger {
    description = {
        displayName: 'Formstack Trigger',
        name: 'formstackTrigger',
        icon: 'file:formstack.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '=Form ID: {{$parameter["formId"]}}',
        description: 'Starts the workflow on a Formstack form submission.',
        defaults: {
            name: 'Formstack Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'formstackApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['accessToken'],
                    },
                },
            },
            {
                name: 'formstackOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['oAuth2'],
                    },
                },
            },
        ],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                path: 'webhook',
            },
        ],
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
                displayName: 'Form Name or ID',
                name: 'formId',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getForms',
                },
                default: '',
                required: true,
                description: 'The Formstack form to monitor for new submissions. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
            {
                displayName: 'Simplify',
                name: 'simple',
                type: 'boolean',
                default: true,
                description: 'Whether to return a simplified version of the response instead of the raw data',
            },
        ],
    };
    methods = {
        loadOptions: {
            getForms,
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const formId = this.getNodeParameter('formId');
                const endpoint = `form/${formId}/webhook.json`;
                const { webhooks } = await apiRequest.call(this, 'GET', endpoint);
                for (const webhook of webhooks) {
                    if (webhook.url === webhookUrl) {
                        webhookData.webhookId = webhook.id;
                        return true;
                    }
                }
                return false;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const formId = this.getNodeParameter('formId');
                const endpoint = `form/${formId}/webhook.json`;
                const webhookSecret = randomBytes(32).toString('hex');
                const body = {
                    url: webhookUrl,
                    standardize_field_values: true,
                    include_field_type: true,
                    content_type: 'json',
                    hmac_secret: webhookSecret,
                };
                const response = await apiRequest.call(this, 'POST', endpoint, body);
                const webhookData = this.getWorkflowStaticData('node');
                webhookData.webhookId = response.id;
                webhookData.webhookSecret = webhookSecret;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                if (webhookData.webhookId !== undefined) {
                    const endpoint = `webhook/${webhookData.webhookId}.json`;
                    try {
                        const body = {};
                        await apiRequest.call(this, 'DELETE', endpoint, body);
                    }
                    catch (e) {
                        return false;
                    }
                    // Remove from the static workflow data so that it is clear
                    // that no webhooks are registered anymore
                    delete webhookData.webhookId;
                    delete webhookData.webhookSecret;
                }
                return true;
            },
        },
    };
    async webhook() {
        if (!verifySignature.call(this)) {
            const res = this.getResponseObject();
            res.status(401).send('Unauthorized').end();
            return {
                noWebhookResponse: true,
            };
        }
        const bodyData = this.getBodyData();
        const simple = this.getNodeParameter('simple');
        const response = bodyData;
        if (simple) {
            for (const key of Object.keys(response)) {
                if (response[key].hasOwnProperty('value')) {
                    response[key] = response[key].value;
                }
            }
        }
        return {
            workflowData: [this.helpers.returnJsonArray([response])],
        };
    }
}
//# sourceMappingURL=FormstackTrigger.node.js.map