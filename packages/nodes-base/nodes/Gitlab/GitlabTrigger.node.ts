import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
} from 'n8n-workflow';

import { gitlabApiRequest } from './GenericFunctions';

const GITLAB_EVENTS = [
	{
		name: 'Comment',
		value: 'note',
		description:
			'Triggered when a new comment is made on commits, merge requests, issues, and code snippets',
	},
	{
		name: 'Confidential Issues',
		value: 'confidential_issues',
		description: "Triggered on confidential issues' events",
	},
	{
		name: 'Confidential Comments',
		value: 'confidential_note',
		description: 'Triggered when a confidential comment is made',
	},
	{
		name: 'Deployments',
		value: 'deployment',
		description: 'Triggered when a deployment starts/succeeds/fails/is cancelled',
	},
	{
		name: 'Issue',
		value: 'issues',
		description:
			'Triggered when a new issue is created or an existing issue was updated/closed/reopened',
	},
	{
		name: 'Job',
		value: 'job',
		description: 'Triggered on status change of a job',
	},
	{
		name: 'Merge Request',
		value: 'merge_requests',
		description:
			'Triggered when a new merge request is created, an existing merge request was updated/merged/closed or a commit is added in the source branch',
	},
	{
		name: 'Pipeline',
		value: 'pipeline',
		description: 'Triggered on status change of Pipeline',
	},
	{
		name: 'Push',
		value: 'push',
		description: 'Triggered when you push to the repository except when pushing tags',
	},
	{
		name: 'Release',
		value: 'releases',
		description: 'Release events are triggered when a release is created or updated',
	},
	{
		name: 'Tag',
		value: 'tag_push',
		description: 'Triggered when you create (or delete) tags to the repository',
	},
	{
		name: 'Wiki Page',
		value: 'wiki_page',
		description: 'Triggered when a wiki page is created, updated or deleted',
	},
];

export class GitlabTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GitLab Trigger',
		name: 'gitlabTrigger',
		icon: 'file:gitlab.svg',
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{$parameter["owner"] + "/" + $parameter["repository"] + ": " + $parameter["events"].join(", ")}}',
		description: 'Starts the workflow when GitLab events occur',
		defaults: {
			name: 'Gitlab Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'gitlabApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'gitlabOAuth2Api',
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
				displayName: 'Repository Owner',
				name: 'owner',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'n8n-io',
				description: 'Owner of the repsitory',
			},
			{
				displayName: 'Repository Name',
				name: 'repository',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'n8n',
				description: 'The name of the repsitory',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					...GITLAB_EVENTS,
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event)',
					},
				],
				required: true,
				default: [],
				description: 'The events to listen to',
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}

				// Webhook got created before so check if it still exists
				const owner = this.getNodeParameter('owner') as string;
				const repository = this.getNodeParameter('repository') as string;

				const path = `${owner}/${repository}`.replace(/\//g, '%2F');

				const endpoint = `/projects/${path}/hooks/${webhookData.webhookId}`;

				try {
					await gitlabApiRequest.call(this, 'GET', endpoint, {});
				} catch (error) {
					if (error.cause.httpCode === '404') {
						// Webhook does not exist
						delete webhookData.webhookId;
						delete webhookData.webhookEvents;

						return false;
					}

					// Some error occured
					throw error;
				}

				// If it did not error then the webhook exists
				return true;
			},
			/**
			 * Gitlab API - Add project hook:
			 * 	https://docs.gitlab.com/ee/api/projects.html#add-project-hook
			 */
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const owner = this.getNodeParameter('owner') as string;
				const repository = this.getNodeParameter('repository') as string;

				let eventsArray = this.getNodeParameter('events', []) as string[];
				if (eventsArray.includes('*')) {
					eventsArray = GITLAB_EVENTS.map((e) => e.value);
				}

				const events: { [key: string]: boolean } = {};
				for (const e of eventsArray) {
					events[`${e}_events`] = true;
				}

				// gitlab set the push_events to true when the field it's not sent.
				// set it to false when it's not picked by the user.
				if (events['push_events'] === undefined) {
					events['push_events'] = false;
				}

				const path = `${owner}/${repository}`.replace(/\//g, '%2F');

				const endpoint = `/projects/${path}/hooks`;

				const body = {
					url: webhookUrl,
					...events,
					enable_ssl_verification: false,
				};

				let responseData;
				try {
					responseData = await gitlabApiRequest.call(this, 'POST', endpoint, body);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					throw new NodeApiError(this.getNode(), responseData, {
						message: 'GitLab webhook creation response did not contain the expected data.',
					});
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;
				webhookData.webhookEvents = eventsArray as string[];

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const owner = this.getNodeParameter('owner') as string;
					const repository = this.getNodeParameter('repository') as string;

					const path = `${owner}/${repository}`.replace(/\//g, '%2F');

					const endpoint = `/projects/${path}/hooks/${webhookData.webhookId}`;
					const body = {};

					try {
						await gitlabApiRequest.call(this, 'DELETE', endpoint, body);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();

		const returnData: IDataObject[] = [];

		returnData.push({
			body: bodyData,
			headers: this.getHeaderData(),
			query: this.getQueryData(),
		});

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
