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
		builderHint: {
			searchHint:
				'When downstream nodes create records (tasks, rows, tickets) per email, guarantee each email is processed exactly once: filter to unread AND mark each email read or move it to a folder after its record is created, or track handled message ids in a Data Table. Otherwise the same email can be reprocessed into duplicates.',
			relatedNodes: [
				{
					nodeType: 'n8n-nodes-base.microsoftOutlook',
					relationHint:
						'Mark polled emails as handled after processing (message update with isRead: true, or message move to a folder) so they are not picked up again',
				},
				{
					nodeType: 'n8n-nodes-base.dataTable',
					relationHint: 'Record handled message ids to skip emails that were already processed',
				},
			],
			extraTypeDefContent: [
				{
					content: `<patterns>
<pattern title="Do not reprocess the same email">
When this trigger feeds an action that creates records (tasks, rows, tickets, messages), ensure each email is handled once: filter to unread emails AND add an Outlook step that marks each email handled — message \`update\` with \`isRead: true\`, or message \`move\` to a processed folder — or record handled message ids in a Data Table — look the id up before creating the record, skip ids already seen, insert it after the create succeeds. The unread filter alone changes nothing if no step ever marks the email read. Wire the mark-as-handled step AFTER the record-creating node, so a mid-run failure cannot consume an email without producing its record.
</pattern>
</patterns>`,
				},
			],
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
