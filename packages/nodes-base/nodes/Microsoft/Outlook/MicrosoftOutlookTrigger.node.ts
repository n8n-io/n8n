import * as moment from 'moment-timezone';
import { IPollFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../Outlook/GenericFunctions';

export class MicrosoftOutlookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Outlook Trigger',
		name: 'microsoftOutlookTrigger',
		icon: 'file:outlook.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers the workflow when a new email gets received',
		defaults: {
			name: 'Microsoft Outlook Trigger',
			color: '#3a71b5',
		},
		credentials: [
			{
				name: 'microsoftOutlookOAuth2Api',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				default: 'inbox',
				description: 'Source folder ID.',
			},
			{
				displayName: 'Action',
				name: 'action',
				description: 'What to do after the email has been received.',
				type: 'options',
				options: [
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Mark as read',
						value: 'markAsRead',
					},
					{
						name: 'Move',
						value: 'move',
					},
					{
						name: 'Nothing',
						value: 'nothing',
					},
				],
				default: 'markAsRead',
			},
			{
				displayName: 'Target Folder ID',
				name: 'targetFolderId',
				description: 'Target folder ID.',
				type: 'string',
				displayOptions: {
					show: {
						action: [
							'move',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Mark as Read',
				name: 'markAsRead',
				description: 'Mark the email as read.',
				type: 'boolean',
				displayOptions: {
					show: {
						action: [
							'move',
						],
					},
				},
				default: false,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						default: '',
						description: 'Fields the response will contain. Multiple can be added separated by ,.',
					},
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'string',
						placeholder: 'isRead eq false',
						default: '',
						description: 'Microsoft Graph API OData $filter query. Information about the syntax can be found <a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter" target="_blank">here</a>.',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const nodeData = this.getWorkflowStaticData('node');
		const folderId = this.getNodeParameter('folderId') as string;
		const action = this.getNodeParameter('action') as string;
		const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;
		const qs: IDataObject = {};
		const returnData: IDataObject[] = [];

		if (additionalFields.fields) {
			qs['$select'] = additionalFields.fields;
		}

		// Fetch messages from last hour if there's no lastTimeChecked timestamp
		if (!nodeData.lastTimeChecked) {
			nodeData.lastTimeChecked = moment().utc().subtract(1, 'hours').format('YYYY-MM-DDTHH:mm:ssZ');
		}
		const timeNow = moment().utc().format('YYYY-MM-DDTHH:mm:ssZ');

		// We'll fetch messages received since the last run
		if (additionalFields.filter) {
			qs['$filter'] = `receivedDateTime ge ${nodeData.lastTimeChecked} and receivedDateTime lt ${timeNow} and ${additionalFields.filter}`;
		} else {
			qs['$filter'] = `receivedDateTime ge ${nodeData.lastTimeChecked} and receivedDateTime lt ${timeNow}`;
		}

		const messages: IDataObject[] = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/mailFolders/${folderId}/messages`,
			{},
			qs,
		);

		// Moving message will change its ID, we'll return these later
		if (action !== 'move') {
			returnData.push.apply(returnData, messages as IDataObject[]);
		}

		if (messages.length > 0 && action !== 'nothing') {
			const credentials = this.getCredentials('microsoftOutlookOAuth2Api');
			const batchRequests: IDataObject[] = [];

			let rootResource = '/me';
			if (credentials!.useShared && credentials!.userPrincipalName) {
				rootResource = `/users/${credentials!.userPrincipalName}`;
			}

			if (action === 'markAsRead') {
				batchRequests.push(...messages.map((email, index) => ({
					method: 'PATCH',
					url: `${rootResource}/messages/${email.id}`,
					body: {
						isRead: true,
					},
					headers: {
						'Content-Type': 'application/json',
					},
				})));
			}

			if (action === 'delete') {
				batchRequests.push(...messages.map((email, index) => ({
					method: 'DELETE',
					url: `${rootResource}/messages/${email.id}`,
				})));
			}

			if (action === 'move') {
				const destinationId = this.getNodeParameter('targetFolderId') as string;
				const markAsRead = this.getNodeParameter('markAsRead') as boolean;

				// Create mark as read requests first, moving message changes IDs
				if (markAsRead) {
					batchRequests.push(...messages.map((email, index) => ({
						method: 'PATCH',
						url: `${rootResource}/messages/${email.id}`,
						body: {
							isRead: true,
						},
						headers: {
							'Content-Type': 'application/json',
						},
					})));
				}

				// Create move requests
				batchRequests.push(...messages.map((email, index) => ({
					method: 'POST',
					url: `${rootResource}/messages/${email.id}/move`,
					body: {
						destinationId,
					},
					headers: {
						'Content-Type': 'application/json',
					},
				})));
			}

			// Max requests in one batch request is 20
			for (let i = 0; i < batchRequests.length; i += 20) {
				const requests = batchRequests.slice(i, i + 20).map((request, index) => ({
					id: index,
					dependsOn: index > 0 ? [(index - 1).toString()] : undefined,
					...request,
				}));

				const batchResponse: IDataObject = await microsoftApiRequest.call(
					this,
					'POST',
					'',
					{requests},
					undefined,
					'https://graph.microsoft.com/v1.0/$batch',
				);
				if (batchResponse.responses && action === 'move') {
					const responses = batchResponse.responses as IDataObject[];

					// Return only the moved message responses (status 201)
					returnData.push(...responses.filter(res => res.status === 201).map(res => res.body as IDataObject));
				}
			}
		}

		// Set lastTimeChecked timestamp after successfully processing messages
		nodeData.lastTimeChecked = timeNow;

		return [this.helpers.returnJsonArray(returnData)];
	}
}
