import { NodeConnectionTypes } from 'n8n-workflow';
import { subscriberFields, subscriberOperations } from './SubscriberDescription';
import { getCustomFields, mailerliteApiRequest, mailerliteApiRequestAllItems, } from '../GenericFunctions';
export class MailerLiteV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            displayName: 'MailerLite',
            name: 'mailerLite',
            group: ['input'],
            version: [2],
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: 'Consume Mailer Lite API',
            defaults: {
                name: 'MailerLite',
            },
            usableAsTool: true,
            inputs: [NodeConnectionTypes.Main],
            outputs: [NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'mailerLiteApi',
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
                            name: 'Subscriber',
                            value: 'subscriber',
                        },
                    ],
                    default: 'subscriber',
                },
                ...subscriberOperations,
                ...subscriberFields,
            ],
        };
    }
    methods = {
        loadOptions: {
            getCustomFields,
        },
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
                if (resource === 'subscriber') {
                    //https://developers.mailerlite.com/reference#create-a-subscriber
                    if (operation === 'create') {
                        const email = this.getNodeParameter('email', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            email,
                            fields: [],
                        };
                        Object.assign(body, additionalFields);
                        if (additionalFields.customFieldsUi) {
                            const customFieldsValues = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFieldsValues) {
                                const fields = {};
                                for (const customFieldValue of customFieldsValues) {
                                    //@ts-ignore
                                    fields[customFieldValue.fieldId] = customFieldValue.value;
                                }
                                body.fields = fields;
                                delete body.customFieldsUi;
                            }
                        }
                        responseData = await mailerliteApiRequest.call(this, 'POST', '/subscribers', body);
                        responseData = responseData.data;
                    }
                    //https://developers.mailerlite.com/reference#single-subscriber
                    if (operation === 'get') {
                        const subscriberId = this.getNodeParameter('subscriberId', i);
                        responseData = await mailerliteApiRequest.call(this, 'GET', `/subscribers/${subscriberId}`);
                        responseData = responseData.data;
                    }
                    //https://developers.mailerlite.com/reference#subscribers
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const filters = this.getNodeParameter('filters', i);
                        if (filters.status) {
                            qs['filter[status]'] = filters.status;
                        }
                        if (returnAll) {
                            responseData = await mailerliteApiRequestAllItems.call(this, 'GET', '/subscribers', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await mailerliteApiRequest.call(this, 'GET', '/subscribers', {}, qs);
                            responseData = responseData.data;
                        }
                    }
                    //https://developers.mailerlite.com/reference#update-subscriber
                    if (operation === 'update') {
                        const subscriberId = this.getNodeParameter('subscriberId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        Object.assign(body, additionalFields);
                        if (additionalFields.customFieldsUi) {
                            const customFieldsValues = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFieldsValues) {
                                const fields = {};
                                for (const customFieldValue of customFieldsValues) {
                                    //@ts-ignore
                                    fields[customFieldValue.fieldId] = customFieldValue.value;
                                }
                                body.fields = fields;
                                delete body.customFieldsUi;
                            }
                        }
                        responseData = await mailerliteApiRequest.call(this, 'PUT', `/subscribers/${subscriberId}`, body);
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=MailerLiteV2.node.js.map