import { NodeConnectionTypes, jsonParse } from 'n8n-workflow';
import { jotformApiRequest } from './GenericFunctions';
export class JotFormTrigger {
    description = {
        displayName: 'Jotform Trigger',
        name: 'jotFormTrigger',
        icon: { light: 'file:jotform.svg', dark: 'file:jotform.dark.svg' },
        group: ['trigger'],
        version: 1,
        description: 'Handle Jotform events via webhooks',
        defaults: {
            name: 'Jotform Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'jotFormApi',
                required: true,
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
                displayName: 'Form Name or ID',
                name: 'form',
                type: 'options',
                required: true,
                typeOptions: {
                    loadOptionsMethod: 'getForms',
                },
                default: '',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
            },
            {
                displayName: 'Resolve Data',
                name: 'resolveData',
                type: 'boolean',
                default: true,
                // eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
                description: 'By default does the webhook-data use internal keys instead of the names. If this option gets activated, it will resolve the keys automatically to the actual names.',
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
            // Get all the available forms to display them to user so that they can
            // select them easily
            async getForms() {
                const returnData = [];
                const qs = {
                    limit: 1000,
                };
                const forms = await jotformApiRequest.call(this, 'GET', '/user/forms', {}, qs);
                if (!Array.isArray(forms?.content))
                    return [];
                for (const form of forms.content) {
                    const formName = form.title;
                    const formId = form.id;
                    returnData.push({
                        name: formName,
                        value: formId,
                    });
                }
                return returnData;
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookData = this.getWorkflowStaticData('node');
                const formId = this.getNodeParameter('form');
                const endpoint = `/form/${formId}/webhooks`;
                try {
                    const responseData = await jotformApiRequest.call(this, 'GET', endpoint);
                    const webhookUrls = Object.values(responseData.content);
                    const webhookUrl = this.getNodeWebhookUrl('default');
                    if (!webhookUrls.includes(webhookUrl)) {
                        return false;
                    }
                    const webhookIds = Object.keys(responseData.content);
                    webhookData.webhookId = webhookIds[webhookUrls.indexOf(webhookUrl)];
                }
                catch (error) {
                    return false;
                }
                return true;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const formId = this.getNodeParameter('form');
                const endpoint = `/form/${formId}/webhooks`;
                const body = {
                    webhookURL: webhookUrl,
                };
                const { content } = await jotformApiRequest.call(this, 'POST', endpoint, body);
                webhookData.webhookId = Object.keys(content)[0];
                return true;
            },
            async delete() {
                let responseData;
                const webhookData = this.getWorkflowStaticData('node');
                const formId = this.getNodeParameter('form');
                const endpoint = `/form/${formId}/webhooks/${webhookData.webhookId}`;
                try {
                    responseData = await jotformApiRequest.call(this, 'DELETE', endpoint);
                }
                catch (error) {
                    return false;
                }
                if (responseData.message !== 'success') {
                    return false;
                }
                delete webhookData.webhookId;
                return true;
            },
        },
    };
    async webhook() {
        const req = this.getRequestObject();
        const formId = this.getNodeParameter('form');
        const resolveData = this.getNodeParameter('resolveData', false);
        const onlyAnswers = this.getNodeParameter('onlyAnswers', false);
        const { data } = req.body;
        const rawRequest = jsonParse(data.rawRequest);
        data.rawRequest = rawRequest;
        let returnData;
        if (!resolveData) {
            if (onlyAnswers) {
                returnData = data.rawRequest;
            }
            else {
                returnData = data;
            }
            return {
                workflowData: [this.helpers.returnJsonArray(returnData)],
            };
        }
        // Resolve the data by requesting the information via API
        const endpoint = `/form/${formId}/questions`;
        const responseData = await jotformApiRequest.call(this, 'GET', endpoint, {});
        // Create a dictionary to resolve the keys
        const questionNames = {};
        for (const question of Object.values(responseData.content)) {
            questionNames[question.name] = question.text;
        }
        // Resolve the keys
        let questionKey;
        const questionsData = {};
        for (const key of Object.keys(rawRequest)) {
            if (!key.includes('_')) {
                continue;
            }
            questionKey = key.split('_').slice(1).join('_');
            if (questionNames[questionKey] === undefined) {
                continue;
            }
            questionsData[questionNames[questionKey]] = rawRequest[key];
        }
        if (onlyAnswers) {
            returnData = questionsData;
        }
        else {
            // @ts-ignore
            data.rawRequest = questionsData;
            returnData = data;
        }
        return {
            workflowData: [this.helpers.returnJsonArray(returnData)],
        };
    }
}
//# sourceMappingURL=JotFormTrigger.node.js.map