import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { pipedriveApiRequest } from './GenericFunctions';

import basicAuth from 'basic-auth';

import { Response } from 'express';

function authorizationError(resp: Response, realm: string, responseCode: number, message?: string) {
	if (message === undefined) {
		message = 'Authorization problem!';
		if (responseCode === 401) {
			message = 'Authorization is required!';
		} else if (responseCode === 403) {
			message = 'Authorization data is wrong!';
		}
	}

	resp.writeHead(responseCode, { 'WWW-Authenticate': `Basic realm="${realm}"` });
	resp.end(message);
	return {
		noWebhookResponse: true,
	};
}

export class PipedriveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pipedrive Trigger',
		name: 'pipedriveTrigger',
		icon: 'file:pipedrive.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Pipedrive events occur',
		defaults: {
			name: 'Pipedrive Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'pipedriveApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiToken'],
					},
				},
			},
			{
				name: 'pipedriveOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						incomingAuthentication: ['basicAuth'],
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
						name: 'API Token',
						value: 'apiToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiToken',
			},
			{
				displayName: 'Incoming Authentication',
				name: 'incomingAuthentication',
				type: 'options',
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
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
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Added',
						value: 'added',
						description: 'Data got added',
						action: 'Data was added',
					},
					{
						name: 'All',
						value: '*',
						description: 'Any change',
						action: 'Any change',
					},
					{
						name: 'Deleted',
						value: 'deleted',
						description: 'Data got deleted',
						action: 'Data was deleted',
					},
					{
						name: 'Merged',
						value: 'merged',
						description: 'Data got merged',
						action: 'Data was merged',
					},
					{
						name: 'Updated',
						value: 'updated',
						description: 'Data got updated',
						action: 'Data was updated',
					},
				],
				default: '*',
				description: 'Type of action to receive notifications about',
			},
			{
				displayName: 'Object',
				name: 'object',
				type: 'options',
				options: [
					{
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Activity Type',
						value: 'activityType',
					},
					{
						name: 'All',
						value: '*',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Note',
						value: 'note',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Person',
						value: 'person',
					},
					{
						name: 'Pipeline',
						value: 'pipeline',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Stage',
						value: 'stage',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: '*',
				description: 'Type of object to receive notifications about',
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const webhookData = this.getWorkflowStaticData('node');

				const eventAction = this.getNodeParameter('action') as string;

				const eventObject = this.getNodeParameter('object') as string;

				// Webhook got created before so check if it still exists
				const endpoint = `/webhooks`;

				const responseData = await pipedriveApiRequest.call(this, 'GET', endpoint, {});

				if (responseData.data === undefined) {
					return false;
				}

				for (const existingData of responseData.data) {
					if (
						existingData.subscription_url === webhookUrl &&
						existingData.event_action === eventAction &&
						existingData.event_object === eventObject
					) {
						// The webhook exists already
						webhookData.webhookId = existingData.id;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const incomingAuthentication = this.getNodeParameter('incomingAuthentication', 0) as string;
				const eventAction = this.getNodeParameter('action') as string;
				const eventObject = this.getNodeParameter('object') as string;

				const endpoint = `/webhooks`;

				const body = {
					event_action: eventAction,
					event_object: eventObject,
					subscription_url: webhookUrl,
					http_auth_user: undefined as string | undefined,
					http_auth_password: undefined as string | undefined,
				};

				if (incomingAuthentication === 'basicAuth') {
					let httpBasicAuth;

					try {
						httpBasicAuth = await this.getCredentials('httpBasicAuth');
					} catch (error) {
						// Do nothing
					}

					if (httpBasicAuth === undefined || !httpBasicAuth.user || !httpBasicAuth.password) {
						// Data is not defined on node so can not authenticate
						return false;
					}

					body.http_auth_user = httpBasicAuth.user as string;
					body.http_auth_password = httpBasicAuth.password as string;
				}

				const responseData = await pipedriveApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.data === undefined || responseData.data.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.data.id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhooks/${webhookData.webhookId}`;
					const body = {};

					try {
						await pipedriveApiRequest.call(this, 'DELETE', endpoint, body);
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
		const req = this.getRequestObject();
		const resp = this.getResponseObject();
		const realm = 'Webhook';

		const incomingAuthentication = this.getNodeParameter('incomingAuthentication', 0) as string;

		if (incomingAuthentication === 'basicAuth') {
			// Basic authorization is needed to call webhook
			let httpBasicAuth: ICredentialDataDecryptedObject | undefined;

			try {
				httpBasicAuth = await this.getCredentials('httpBasicAuth');
			} catch (error) {
				// Do nothing
			}

			if (httpBasicAuth === undefined || !httpBasicAuth.user || !httpBasicAuth.password) {
				// Data is not defined on node so can not authenticate
				return authorizationError(resp, realm, 500, 'No authentication data defined on node!');
			}

			const basicAuthData = basicAuth(req);

			if (basicAuthData === undefined) {
				// Authorization data is missing
				return authorizationError(resp, realm, 401);
			}

			if (
				basicAuthData.name !== httpBasicAuth!.user ||
				basicAuthData.pass !== httpBasicAuth!.password
			) {
				// Provided authentication data is wrong
				return authorizationError(resp, realm, 403);
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}
