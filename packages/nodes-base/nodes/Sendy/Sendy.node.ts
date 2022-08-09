import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	sendyApiRequest,
} from './GenericFunctions';

import {
	campaignFields,
	campaignOperations,
} from './CampaignDescription';

import {
	subscriberFields,
	subscriberOperations,
} from './SubscriberDescription';

export class Sendy implements INodeType {
	description: INodeTypeDescription = {
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
		inputs: ['main'],
		outputs: ['main'],
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {

			if (resource === 'campaign') {
				if (operation === 'create') {

					const fromName = this.getNodeParameter('fromName', i) as string;

					const fromEmail = this.getNodeParameter('fromEmail', i) as string;

					const replyTo = this.getNodeParameter('replyTo', i) as string;

					const title = this.getNodeParameter('title', i) as string;

					const subject = this.getNodeParameter('subject', i) as string;

					const htmlText = this.getNodeParameter('htmlText', i) as boolean;

					const sendCampaign = this.getNodeParameter('sendCampaign', i) as boolean;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						from_name: fromName,
						from_email: fromEmail,
						reply_to: replyTo,
						title,
						subject,
						send_campaign: sendCampaign ? 1 : 0,
						html_text: htmlText,
					};

					if (additionalFields.plainText) {
						body.plain_text = additionalFields.plainText;
					}

					if (additionalFields.listIds) {
						body.list_ids = additionalFields.listIds as string;
					}

					if (additionalFields.segmentIds) {
						body.segment_ids = additionalFields.segmentIds as string;
					}

					if (additionalFields.excludeListIds) {
						body.exclude_list_ids = additionalFields.excludeListIds as string;
					}

					if (additionalFields.excludeSegmentIds) {
						body.exclude_segments_ids = additionalFields.excludeSegmentIds as string;
					}

					if (additionalFields.brandId) {
						body.brand_id = additionalFields.brandId as string;
					}

					if (additionalFields.queryString) {
						body.query_string = additionalFields.queryString as string;
					}

					if (additionalFields.trackOpens) {
						body.track_opens = additionalFields.trackOpens as boolean ? 1 : 0;
					}

					if (additionalFields.trackClicks) {
						body.track_clicks = additionalFields.trackClicks as boolean ? 1 : 0;
					}

					responseData = await sendyApiRequest.call(
						this,
						'POST',
						'/api/campaigns/create.php',
						body,
					);

					const success = [
						'Campaign created',
						'Campaign created and now sending',
					];

					if (success.includes(responseData)) {
						responseData = { message: responseData };
					} else {
						throw new NodeApiError(this.getNode(), responseData, { httpCode: '400' });
					}
				}
			}

			if (resource === 'subscriber') {
				if (operation === 'add') {

					const email = this.getNodeParameter('email', i) as string;

					const listId = this.getNodeParameter('listId', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						email,
						list: listId,
					};

					Object.assign(body, additionalFields);

					responseData = await sendyApiRequest.call(
						this,
						'POST',
						'/subscribe',
						body,
					);

					if (responseData === '1') {
						responseData = { success: true };
					} else {
						throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
					}
				}

				if (operation === 'count') {

					const listId = this.getNodeParameter('listId', i) as string;

					const body: IDataObject = {
						list_id: listId,
					};

					responseData = await sendyApiRequest.call(
						this,
						'POST',
						'/api/subscribers/active-subscriber-count.php',
						body,
					);

					const errors = [
						'No data passed',
						'API key not passed',
						'Invalid API key',
						'List ID not passed',
						'List does not exist',
					];

					if (!errors.includes(responseData)) {
						responseData = { count: responseData };
					} else {
						throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
					}
				}

				if (operation === 'delete') {

					const email = this.getNodeParameter('email', i) as string;

					const listId = this.getNodeParameter('listId', i) as string;

					const body: IDataObject = {
						email,
						list_id: listId,
					};

					responseData = await sendyApiRequest.call(
						this,
						'POST',
						'/api/subscribers/delete.php',
						body,
					);

					if (responseData === '1') {
						responseData = { success: true };
					} else {
						throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
					}
				}

				if (operation === 'remove') {

					const email = this.getNodeParameter('email', i) as string;

					const listId = this.getNodeParameter('listId', i) as string;

					const body: IDataObject = {
						email,
						list: listId,
					};

					responseData = await sendyApiRequest.call(
						this,
						'POST',
						'/unsubscribe',
						body,
					);

					if (responseData === '1') {
						responseData = { success: true };
					} else {
						throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
					}
				}

				if (operation === 'status') {

					const email = this.getNodeParameter('email', i) as string;

					const listId = this.getNodeParameter('listId', i) as string;

					const body: IDataObject = {
						email,
						list_id: listId,
					};

					responseData = await sendyApiRequest.call(
						this,
						'POST',
						'/api/subscribers/subscription-status.php',
						body,
					);

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
					} else {
						throw new NodeOperationError(this.getNode(), `Sendy error response [${400}]: ${responseData}`, { itemIndex: i });
					}
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
