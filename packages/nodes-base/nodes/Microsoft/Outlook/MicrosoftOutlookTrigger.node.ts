import { DateTime } from 'luxon';
import {
	type IPollFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { getPollResponse } from './trigger/GenericFunctions';
import { properties as messageProperties } from './trigger/MessageDescription';
import { mailboxDescription } from './v2/descriptions';
import { loadOptions } from './v2/methods';

export class MicrosoftOutlookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Outlook Trigger',
		name: 'microsoftOutlookTrigger',
		icon: 'file:outlook.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Fetches emails from Microsoft Outlook and starts the workflow on specified polling intervals.',
		subtitle: '={{"Microsoft Outlook Trigger"}}',
		defaults: {
			name: 'Microsoft Outlook Trigger',
		},
		credentials: [
			{
				name: 'microsoftOutlookOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOutlookOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftEntraServicePrincipalApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftEntraServicePrincipalApi'],
					},
				},
			},
		],
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Outlook OAuth2',
						value: 'microsoftOutlookOAuth2Api',
					},
					{
						name: 'Microsoft OAuth2 (Graph)',
						value: 'microsoftOAuth2Api',
					},
					{
						name: 'Microsoft Entra Service Principal (App-Only)',
						value: 'microsoftEntraServicePrincipalApi',
						description:
							'App-only access via a Microsoft Entra app registration. Choose which mailbox to act on under "Mailbox".',
					},
				],
				default: 'microsoftOutlookOAuth2Api',
			},
			...mailboxDescription,
			{
				displayName:
					'Unless restricted by an Application Access Policy (Exchange Online New-ApplicationAccessPolicy), the Mail.Read application permission lets this app read any mailbox in the tenant',
				name: 'servicePrincipalNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						authentication: ['microsoftEntraServicePrincipalApi'],
					},
				},
			},
			{
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				default: 'messageReceived',
				options: [
					{
						name: 'Message Received',
						value: 'messageReceived',
					},
				],
			},
			...messageProperties,
		],
	};

	methods = { loadOptions };

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		let responseData;

		const now = DateTime.now().toISO();
		const startDate = (webhookData.lastTimeChecked as string) || now;
		const endDate = now;
		try {
			const pollStartDate = startDate;
			const pollEndDate = endDate;

			responseData = await getPollResponse.call(this, pollStartDate, pollEndDate);

			if (!responseData?.length) {
				webhookData.lastTimeChecked = endDate;
				return null;
			}
		} catch (error) {
			if (this.getMode() === 'manual' || !webhookData.lastTimeChecked) {
				throw error;
			}
			const workflow = this.getWorkflow();
			const node = this.getNode();
			this.logger.error(
				`There was a problem in '${node.name}' node in workflow '${workflow.id}': '${error.description}'`,
				{
					node: node.name,
					workflowId: workflow.id,
					error,
				},
			);
			return null;
		}

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(responseData) && responseData.length) {
			return [responseData];
		}

		return null;
	}
}
