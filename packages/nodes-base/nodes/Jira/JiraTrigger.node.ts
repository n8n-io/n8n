import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

import { allEvents, eventExists, getId, jiraSoftwareCloudApiRequest } from './GenericFunctions';

export class JiraTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jira Trigger',
		name: 'jiraTrigger',
		icon: 'file:jira.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Jira events occur',
		defaults: {
			name: 'Jira Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'jiraSoftwareCloudApi',
				required: true,
				displayOptions: {
					show: {
						jiraVersion: ['cloud'],
					},
				},
			},
			{
				name: 'jiraSoftwareServerApi',
				required: true,
				displayOptions: {
					show: {
						jiraVersion: ['server'],
					},
				},
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'httpQueryAuth',
				required: true,
				displayOptions: {
					show: {
						incomingAuthentication: ['queryAuth'],
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
				displayName: 'Jira Version',
				name: 'jiraVersion',
				type: 'options',
				options: [
					{
						name: 'Cloud',
						value: 'cloud',
					},
					{
						name: 'Server (Self Hosted)',
						value: 'server',
					},
				],
				default: 'cloud',
			},
			{
				displayName: 'Incoming Authentication',
				name: 'incomingAuthentication',
				type: 'options',
				options: [
					{
						name: 'Query Auth',
						value: 'queryAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'If authentication should be activated for the webhook (makes it more secure)',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: '*',
						value: '*',
					},
					{
						name: 'Board Configuration Changed',
						value: 'board_configuration_changed',
					},
					{
						name: 'Board Created',
						value: 'board_created',
					},
					{
						name: 'Board Deleted',
						value: 'board_deleted',
					},
					{
						name: 'Board Updated',
						value: 'board_updated',
					},
					{
						name: 'Comment Created',
						value: 'comment_created',
					},
					{
						name: 'Comment Deleted',
						value: 'comment_deleted',
					},
					{
						name: 'Comment Updated',
						value: 'comment_updated',
					},
					{
						name: 'Issue Created',
						value: 'jira:issue_created',
					},
					{
						name: 'Issue Deleted',
						value: 'jira:issue_deleted',
					},
					{
						name: 'Issue Link Created',
						value: 'issuelink_created',
					},
					{
						name: 'Issue Link Deleted',
						value: 'issuelink_deleted',
					},
					{
						name: 'Issue Updated',
						value: 'jira:issue_updated',
					},
					{
						name: 'Option Attachments Changed',
						value: 'option_attachments_changed',
					},
					{
						name: 'Option Issue Links Changed',
						value: 'option_issuelinks_changed',
					},
					{
						name: 'Option Subtasks Changed',
						value: 'option_subtasks_changed',
					},
					{
						name: 'Option Timetracking Changed',
						value: 'option_timetracking_changed',
					},
					{
						name: 'Option Unassigned Issues Changed',
						value: 'option_unassigned_issues_changed',
					},
					{
						name: 'Option Voting Changed',
						value: 'option_voting_changed',
					},
					{
						name: 'Option Watching Changed',
						value: 'option_watching_changed',
					},
					{
						name: 'Project Created',
						value: 'project_created',
					},
					{
						name: 'Project Deleted',
						value: 'project_deleted',
					},
					{
						name: 'Project Updated',
						value: 'project_updated',
					},
					{
						name: 'Sprint Closed',
						value: 'sprint_closed',
					},
					{
						name: 'Sprint Created',
						value: 'sprint_created',
					},
					{
						name: 'Sprint Deleted',
						value: 'sprint_deleted',
					},
					{
						name: 'Sprint Started',
						value: 'sprint_started',
					},
					{
						name: 'Sprint Updated',
						value: 'sprint_updated',
					},
					{
						name: 'User Created',
						value: 'user_created',
					},
					{
						name: 'User Deleted',
						value: 'user_deleted',
					},
					{
						name: 'User Updated',
						value: 'user_updated',
					},
					{
						name: 'Version Created',
						value: 'jira:version_created',
					},
					{
						name: 'Version Deleted',
						value: 'jira:version_deleted',
					},
					{
						name: 'Version Moved',
						value: 'jira:version_moved',
					},
					{
						name: 'Version Released',
						value: 'jira:version_released',
					},
					{
						name: 'Version Unreleased',
						value: 'jira:version_unreleased',
					},
					{
						name: 'Version Updated',
						value: 'jira:version_updated',
					},
					{
						name: 'Worklog Created',
						value: 'worklog_created',
					},
					{
						name: 'Worklog Deleted',
						value: 'worklog_deleted',
					},
					{
						name: 'Worklog Updated',
						value: 'worklog_updated',
					},
				],
				required: true,
				default: [],
				description: 'The events to listen to',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Exclude Body',
						name: 'excludeBody',
						type: 'boolean',
						default: false,
						description:
							'Whether a request with empty body will be sent to the URL. Leave unchecked if you want to receive JSON.',
					},
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						placeholder: 'Project = JRA AND resolution = Fixed',
						description:
							'You can specify a JQL query to send only events triggered by matching issues. The JQL filter only applies to events under the Issue and Comment columns.',
					},
					{
						displayName: 'Include Fields',
						name: 'includeFields',
						type: 'multiOptions',
						options: [
							{
								name: 'Attachment ID',
								value: 'attachment.id',
							},
							{
								name: 'Board ID',
								value: 'board.id',
							},
							{
								name: 'Comment ID',
								value: 'comment.id',
							},
							{
								name: 'Issue ID',
								value: 'issue.id',
							},
							{
								name: 'Merge Version ID',
								value: 'mergeVersion.id',
							},
							{
								name: 'Modified User Account ID',
								value: 'modifiedUser.accountId',
							},
							{
								name: 'Modified User Key',
								value: 'modifiedUser.key',
							},
							{
								name: 'Modified User Name',
								value: 'modifiedUser.name',
							},
							{
								name: 'Project ID',
								value: 'project.id',
							},
							{
								name: 'Project Key',
								value: 'project.key',
							},
							{
								name: 'Propery Key',
								value: 'property.key',
							},
							{
								name: 'Sprint ID',
								value: 'sprint.id',
							},
							{
								name: 'Version ID',
								value: 'version.id',
							},
							{
								name: 'Worklog ID',
								value: 'worklog.id',
							},
						],
						default: [],
					},
				],
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const webhookData = this.getWorkflowStaticData('node');

				const events = this.getNodeParameter('events') as string[];

				const endpoint = `/webhooks/1.0/webhook`;

				const webhooks = await jiraSoftwareCloudApiRequest.call(this, endpoint, 'GET', {});

				for (const webhook of webhooks) {
					if (webhook.url === webhookUrl && eventExists(events, webhook.events)) {
						webhookData.webhookId = getId(webhook.self);
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				let events = this.getNodeParameter('events', []) as string[];

				const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;

				const endpoint = `/webhooks/1.0/webhook`;

				const webhookData = this.getWorkflowStaticData('node');

				const incomingAuthentication = this.getNodeParameter('incomingAuthentication') as string;

				if (events.includes('*')) {
					events = allEvents;
				}

				const body = {
					name: `n8n-webhook:${webhookUrl}`,
					url: webhookUrl,
					events,
					filters: {},
					excludeBody: false,
				};

				if (additionalFields.filter) {
					body.filters = {
						'issue-related-events-section': additionalFields.filter,
					};
				}

				if (additionalFields.excludeBody) {
					body.excludeBody = additionalFields.excludeBody as boolean;
				}

				const parameters: any = {};

				if (incomingAuthentication === 'queryAuth') {
					let httpQueryAuth;
					try {
						httpQueryAuth = await this.getCredentials('httpQueryAuth');
					} catch (e) {
						throw new NodeOperationError(
							this.getNode(),
							`Could not retrieve HTTP Query Auth credentials: ${e}`,
						);
					}
					if (!httpQueryAuth.name && !httpQueryAuth.value) {
						throw new NodeOperationError(this.getNode(), `HTTP Query Auth credentials are empty`);
					}
					parameters[encodeURIComponent(httpQueryAuth.name as string)] = Buffer.from(
						httpQueryAuth.value as string,
					).toString('base64');
				}

				if (additionalFields.includeFields) {
					for (const field of additionalFields.includeFields as string[]) {
						parameters[field] = '${' + field + '}';
					}
				}

				if (Object.keys(parameters).length) {
					const params = new URLSearchParams(parameters).toString();
					body.url = `${body.url}?${decodeURIComponent(params)}`;
				}

				const responseData = await jiraSoftwareCloudApiRequest.call(this, endpoint, 'POST', body);

				webhookData.webhookId = getId(responseData.self);

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhooks/1.0/webhook/${webhookData.webhookId}`;
					const body = {};

					try {
						await jiraSoftwareCloudApiRequest.call(this, endpoint, 'DELETE', body);
					} catch (error) {
						return false;
					}
					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const queryData = this.getQueryData() as IDataObject;
		const response = this.getResponseObject();

		const incomingAuthentication = this.getNodeParameter('incomingAuthentication') as string;

		if (incomingAuthentication === 'queryAuth') {
			let httpQueryAuth: ICredentialDataDecryptedObject | undefined;

			try {
				httpQueryAuth = await this.getCredentials('httpQueryAuth');
			} catch (error) {}

			if (httpQueryAuth === undefined || !httpQueryAuth.name || !httpQueryAuth.value) {
				response
					.status(403)
					.json({ message: 'Auth settings are not valid, some data are missing' });

				return {
					noWebhookResponse: true,
				};
			}

			const paramName = httpQueryAuth.name as string;
			const paramValue = Buffer.from(httpQueryAuth.value as string).toString('base64');

			if (!queryData.hasOwnProperty(paramName) || queryData[paramName] !== paramValue) {
				response.status(403).json({ message: 'Provided authentication data is not valid' });

				return {
					noWebhookResponse: true,
				};
			}

			delete queryData[paramName];

			Object.assign(bodyData, queryData);
		} else {
			Object.assign(bodyData, queryData);
		}

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
