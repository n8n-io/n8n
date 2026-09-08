import { randomBytes } from 'crypto';
import { NodeApiError, NodeConnectionTypes, randomString } from 'n8n-workflow';
import { apiRequest, getForms } from './GenericFunctions';
import { verifySignature } from './TypeformTriggerHelpers';
export class TypeformTrigger {
    description = {
        displayName: 'Typeform Trigger',
        name: 'typeformTrigger',
        icon: { light: 'file:typeform.svg', dark: 'file:typeform.dark.svg' },
        group: ['trigger'],
        version: [1, 1.1],
        subtitle: '=Form ID: {{$parameter["formId"]}}',
        description: 'Starts the workflow on a Typeform form submission',
        defaults: {
            name: 'Typeform Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'typeformApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['accessToken'],
                    },
                },
                testedBy: 'testTypeformTokenAuth',
            },
            {
                name: 'typeformOAuth2Api',
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
                options: [],
                default: '',
                required: true,
                description: 'Form which should trigger workflow on submission. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
            {
                displayName: 'Simplify Answers',
                name: 'simplifyAnswers',
                type: 'boolean',
                default: true,
                description: 'Whether to convert the answers to a key:value pair ("FIELD_TITLE":"USER_ANSER") to be easily processable',
            },
            {
                displayName: 'Only Answers',
                name: 'onlyAnswers',
                type: 'boolean',
                default: true,
                description: 'Whether to return only the answers of the form and not any of the other data',
            },
        ],
    };
    methods = {
        loadOptions: {
            getForms,
        },
        credentialTest: {
            async testTypeformTokenAuth(credential) {
                const credentials = credential.data;
                const options = {
                    headers: {
                        authorization: `bearer ${credentials.accessToken}`,
                    },
                    uri: 'https://api.typeform.com/workspaces',
                    json: true,
                };
                try {
                    const response = await this.helpers.request(options);
                    if (!response.items) {
                        return {
                            status: 'Error',
                            message: 'Token is not valid.',
                        };
                    }
                }
                catch (err) {
                    return {
                        status: 'Error',
                        message: `Token is not valid; ${err.message}`,
                    };
                }
                return {
                    status: 'OK',
                    message: 'Authentication successful!',
                };
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                const formId = this.getNodeParameter('formId');
                const endpoint = `forms/${formId}/webhooks`;
                const { items } = await apiRequest.call(this, 'GET', endpoint, {});
                for (const item of items) {
                    if (item.form_id === formId && item.url === webhookUrl) {
                        webhookData.webhookId = item.tag;
                        return true;
                    }
                }
                return false;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const formId = this.getNodeParameter('formId');
                const webhookId = 'n8n-' + randomString(10).toLowerCase();
                const endpoint = `forms/${formId}/webhooks/${webhookId}`;
                // Generate a secret for webhook signature verification
                const webhookSecret = randomBytes(32).toString('hex');
                const body = {
                    url: webhookUrl,
                    enabled: true,
                    verify_ssl: true,
                    secret: webhookSecret,
                };
                await apiRequest.call(this, 'PUT', endpoint, body);
                const webhookData = this.getWorkflowStaticData('node');
                webhookData.webhookId = webhookId;
                webhookData.webhookSecret = webhookSecret;
                return true;
            },
            async delete() {
                const formId = this.getNodeParameter('formId');
                const webhookData = this.getWorkflowStaticData('node');
                if (webhookData.webhookId !== undefined) {
                    const endpoint = `forms/${formId}/webhooks/${webhookData.webhookId}`;
                    try {
                        const body = {};
                        await apiRequest.call(this, 'DELETE', endpoint, body);
                    }
                    catch (error) {
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
        // Verify webhook signature if secret is configured
        if (!verifySignature.call(this)) {
            const res = this.getResponseObject();
            res.status(401).send('Unauthorized').end();
            return {
                noWebhookResponse: true,
            };
        }
        const version = this.getNode().typeVersion;
        const bodyData = this.getBodyData();
        const simplifyAnswers = this.getNodeParameter('simplifyAnswers');
        const onlyAnswers = this.getNodeParameter('onlyAnswers');
        if (bodyData.form_response === undefined ||
            bodyData.form_response.definition === undefined ||
            bodyData.form_response.answers === undefined) {
            throw new NodeApiError(this.getNode(), bodyData, {
                message: 'Expected definition/answers data is missing!',
            });
        }
        const answers = bodyData.form_response.answers;
        // Some fields contain lower level fields of which we are only interested of the values
        const subValueKeys = ['label', 'labels'];
        if (simplifyAnswers) {
            // Convert the answers to simple key -> value pairs
            const definition = bodyData.form_response.definition;
            // Create a dictionary to get the field title by its ID
            const definitionsById = {};
            for (const field of definition.fields) {
                definitionsById[field.id] = field.title.replace(/\{\{/g, '[').replace(/\}\}/g, ']');
            }
            // Convert the answers to key -> value pair
            const convertedAnswers = {};
            for (const answer of answers) {
                let value = answer[answer.type];
                if (typeof value === 'object') {
                    for (const key of subValueKeys) {
                        if (value[key] !== undefined) {
                            value = value[key];
                            break;
                        }
                    }
                }
                convertedAnswers[definitionsById[answer.field.id]] = value;
            }
            if (onlyAnswers) {
                // Only the answers should be returned so do it directly
                return {
                    workflowData: [this.helpers.returnJsonArray([convertedAnswers])],
                };
            }
            else {
                // All data should be returned but the answers should still be
                // converted to key -> value pair so overwrite the answers.
                bodyData.form_response.answers = convertedAnswers;
            }
        }
        if (onlyAnswers) {
            // Return only the answers
            if (version >= 1.1) {
                return {
                    workflowData: [
                        this.helpers.returnJsonArray([
                            answers.reduce((acc, answer) => {
                                acc[answer.field.id] = answer;
                                return acc;
                            }, {}),
                        ]),
                    ],
                };
            }
            return {
                workflowData: [this.helpers.returnJsonArray([answers])],
            };
        }
        else {
            // Return all the data that got received
            return {
                workflowData: [this.helpers.returnJsonArray([bodyData])],
            };
        }
    }
}
//# sourceMappingURL=TypeformTrigger.node.js.map