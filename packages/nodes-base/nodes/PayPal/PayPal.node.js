import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { payPalApiRequest, payPalApiRequestAllItems, validateJSON } from './GenericFunctions';
import { payoutFields, payoutItemFields, payoutItemOperations, payoutOperations, } from './PaymentDescription';
export class PayPal {
    description = {
        displayName: 'PayPal',
        name: 'payPal',
        icon: 'file:paypal.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume PayPal API',
        defaults: {
            name: 'PayPal',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'payPalApi',
                required: true,
                testedBy: 'payPalApiTest',
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
                        name: 'Payout',
                        value: 'payout',
                    },
                    {
                        name: 'Payout Item',
                        value: 'payoutItem',
                    },
                ],
                default: 'payout',
            },
            // Payout
            ...payoutOperations,
            ...payoutItemOperations,
            ...payoutFields,
            ...payoutItemFields,
        ],
    };
    methods = {
        credentialTest: {
            async payPalApiTest(credential) {
                const credentials = credential.data;
                const clientId = credentials.clientId;
                const clientSecret = credentials.secret;
                const environment = credentials.env;
                if (!clientId || !clientSecret || !environment) {
                    return {
                        status: 'Error',
                        message: 'Connection details not valid: missing credentials',
                    };
                }
                let baseUrl = '';
                if (environment !== 'live') {
                    baseUrl = 'https://api-m.sandbox.paypal.com';
                }
                else {
                    baseUrl = 'https://api-m.paypal.com';
                }
                const base64Key = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
                const options = {
                    headers: {
                        Authorization: `Basic ${base64Key}`,
                    },
                    method: 'POST',
                    uri: `${baseUrl}/v1/oauth2/token`,
                    form: {
                        grant_type: 'client_credentials',
                    },
                };
                try {
                    await this.helpers.request(options);
                    return {
                        status: 'OK',
                        message: 'Authentication successful!',
                    };
                }
                catch (error) {
                    return {
                        status: 'Error',
                        message: `Connection details not valid: ${error.message}`,
                    };
                }
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const qs = {};
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'payout') {
                    if (operation === 'create') {
                        const body = {};
                        const header = {};
                        const jsonActive = this.getNodeParameter('jsonParameters', i);
                        const senderBatchId = this.getNodeParameter('senderBatchId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        header.sender_batch_id = senderBatchId;
                        if (additionalFields.emailSubject) {
                            header.email_subject = additionalFields.emailSubject;
                        }
                        if (additionalFields.emailMessage) {
                            header.email_message = additionalFields.emailMessage;
                        }
                        if (additionalFields.note) {
                            header.note = additionalFields.note;
                        }
                        body.sender_batch_header = header;
                        if (!jsonActive) {
                            const payoutItems = [];
                            const itemsValues = this.getNodeParameter('itemsUi', i)
                                .itemsValues;
                            if (itemsValues && itemsValues.length > 0) {
                                itemsValues.forEach((o) => {
                                    const payoutItem = {};
                                    const amount = {};
                                    amount.currency = o.currency;
                                    amount.value = parseFloat(o.amount);
                                    payoutItem.amount = amount;
                                    payoutItem.note = o.note || '';
                                    payoutItem.receiver = o.receiverValue;
                                    payoutItem.recipient_type = o.recipientType;
                                    payoutItem.recipient_wallet = o.recipientWallet;
                                    payoutItem.sender_item_id = o.senderItemId || '';
                                    payoutItems.push(payoutItem);
                                });
                                body.items = payoutItems;
                            }
                            else {
                                throw new NodeOperationError(this.getNode(), 'You must have at least one item.', {
                                    itemIndex: i,
                                });
                            }
                        }
                        else {
                            const itemsJson = validateJSON(this.getNodeParameter('itemsJson', i));
                            body.items = itemsJson;
                        }
                        responseData = await payPalApiRequest.call(this, '/payments/payouts', 'POST', body);
                    }
                    if (operation === 'get') {
                        const payoutBatchId = this.getNodeParameter('payoutBatchId', i);
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        if (returnAll) {
                            responseData = await payPalApiRequestAllItems.call(this, 'items', `/payments/payouts/${payoutBatchId}`, 'GET', {}, qs);
                        }
                        else {
                            qs.page_size = this.getNodeParameter('limit', i);
                            responseData = await payPalApiRequest.call(this, `/payments/payouts/${payoutBatchId}`, 'GET', {}, qs);
                            responseData = responseData.items;
                        }
                    }
                }
                else if (resource === 'payoutItem') {
                    if (operation === 'get') {
                        const payoutItemId = this.getNodeParameter('payoutItemId', i);
                        responseData = await payPalApiRequest.call(this, `/payments/payouts-item/${payoutItemId}`, 'GET', {}, qs);
                    }
                    if (operation === 'cancel') {
                        const payoutItemId = this.getNodeParameter('payoutItemId', i);
                        responseData = await payPalApiRequest.call(this, `/payments/payouts-item/${payoutItemId}/cancel`, 'POST', {}, qs);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=PayPal.node.js.map