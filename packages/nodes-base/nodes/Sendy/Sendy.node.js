import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { campaignFields, campaignOperations } from './CampaignDescription';
import { sendyApiRequest } from './GenericFunctions';
import { subscriberFields, subscriberOperations } from './SubscriberDescription';
export class Sendy {
    description = {
        displayName: 'Sendy',
        name: 'sendy',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:sendy.png',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Sendy API',
        defaults: {
            name: 'Sendy',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'sendyApi',
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
                        name: 'Campaign',
                        value: 'campaign',
                    },
                    {
                        name: 'Subscriber',
                        value: 'subscriber',
                    },
                ],
                default: 'subscriber',
            },
            ...campaignOperations,
            ...campaignFields,
            ...subscriberOperations,
            ...subscriberFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            if (resource === 'campaign') {
                if (operation === 'create') {
                    const fromName = this.getNodeParameter('fromName', i);
                    const fromEmail = this.getNodeParameter('fromEmail', i);
                    const replyTo = this.getNodeParameter('replyTo', i);
                    const title = this.getNodeParameter('title', i);
                    const subject = this.getNodeParameter('subject', i);
                    const htmlText = this.getNodeParameter('htmlText', i);
                    const sendCampaign = this.getNodeParameter('sendCampaign', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    let brandId = null;
                    if (!sendCampaign) {
                        brandId = this.getNodeParameter('brandId', i);
                    }
                    const body = {
                        from_name: fromName,
                        from_email: fromEmail,
                        reply_to: replyTo,
                        title,
                        subject,
                        send_campaign: sendCampaign ? 1 : 0,
                        html_text: htmlText,
                    };
                    if (brandId) {
                        body.brand_id = brandId;
                    }
                    if (additionalFields.plainText) {
                        body.plain_text = additionalFields.plainText;
                    }
                    if (additionalFields.listIds) {
                        body.list_ids = additionalFields.listIds;
                    }
                    if (additionalFields.segmentIds) {
                        body.segment_ids = additionalFields.segmentIds;
                    }
                    if (additionalFields.excludeListIds) {
                        body.exclude_list_ids = additionalFields.excludeListIds;
                    }
                    if (additionalFields.excludeSegmentIds) {
                        body.exclude_segments_ids = additionalFields.excludeSegmentIds;
                    }
                    if (additionalFields.queryString) {
                        body.query_string = additionalFields.queryString;
                    }
                    if (additionalFields.trackOpens) {
                        body.track_opens = additionalFields.trackOpens ? 1 : 0;
                    }
                    if (additionalFields.trackClicks) {
                        body.track_clicks = additionalFields.trackClicks ? 1 : 0;
                    }
                    responseData = await sendyApiRequest.call(this, 'POST', '/api/campaigns/create.php', body);
                    const success = ['Campaign created', 'Campaign created and now sending'];
                    if (success.includes(responseData)) {
                        responseData = { message: responseData };
                    }
                    else {
                        throw new NodeApiError(this.getNode(), responseData, { httpCode: '400' });
                    }
                }
            }
            if (resource === 'subscriber') {
                if (operation === 'add') {
                    const email = this.getNodeParameter('email', i);
                    const listId = this.getNodeParameter('listId', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        email,
                        list: listId,
                    };
                    Object.assign(body, additionalFields);
                    responseData = await sendyApiRequest.call(this, 'POST', '/subscribe', body);
                    if (responseData === '1') {
                        responseData = { success: true };
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
                    }
                }
                if (operation === 'count') {
                    const listId = this.getNodeParameter('listId', i);
                    const body = {
                        list_id: listId,
                    };
                    responseData = await sendyApiRequest.call(this, 'POST', '/api/subscribers/active-subscriber-count.php', body);
                    const errors = [
                        'No data passed',
                        'API key not passed',
                        'Invalid API key',
                        'List ID not passed',
                        'List does not exist',
                    ];
                    if (!errors.includes(responseData)) {
                        responseData = { count: responseData };
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
                    }
                }
                if (operation === 'delete') {
                    const email = this.getNodeParameter('email', i);
                    const listId = this.getNodeParameter('listId', i);
                    const body = {
                        email,
                        list_id: listId,
                    };
                    responseData = await sendyApiRequest.call(this, 'POST', '/api/subscribers/delete.php', body);
                    if (responseData === '1') {
                        responseData = { success: true };
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
                    }
                }
                if (operation === 'remove') {
                    const email = this.getNodeParameter('email', i);
                    const listId = this.getNodeParameter('listId', i);
                    const body = {
                        email,
                        list: listId,
                    };
                    responseData = await sendyApiRequest.call(this, 'POST', '/unsubscribe', body);
                    if (responseData === '1') {
                        responseData = { success: true };
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
                    }
                }
                if (operation === 'status') {
                    const email = this.getNodeParameter('email', i);
                    const listId = this.getNodeParameter('listId', i);
                    const body = {
                        email,
                        list_id: listId,
                    };
                    responseData = await sendyApiRequest.call(this, 'POST', '/api/subscribers/subscription-status.php', body);
                    const status = [
                        'Subscribed',
                        'Unsubscribed',
                        'Unconfirmed',
                        'Bounced',
                        'Soft bounced',
                        'Complained',
                    ];
                    if (status.includes(responseData)) {
                        responseData = { status: responseData };
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
                    }
                }
            }
        }
        if (Array.isArray(responseData)) {
            returnData.push.apply(returnData, responseData);
        }
        else if (responseData !== undefined) {
            returnData.push(responseData);
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=Sendy.node.js.map