// import { google } from 'googleapis';

import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
  googleApiRequest
} from './GenericFunctions';

import * as uuid from 'uuid/v4';
import moment = require('moment');

// import { getAuthenticationClient } from './GoogleApi';


export class GoogleDriveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Drive Trigger',
		name: 'googleDriveTrigger',
		icon: 'file:googleDrive.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["owner"] + "/" + $parameter["repository"] + ": " + $parameter["events"].join(", ")}}',
		description: 'Starts the workflow when a file on Google Drive got changed.',
		defaults: {
			name: 'Google Drive Trigger',
			color: '#3f87f2',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleDriveOAuth2Api',
				required: true,
			}
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
				displayName: 'Resource ID',
				name: 'resourceId',
				type: 'string',
				default: '',
				required: true,
				placeholder: '',
				description: 'ID of the resource to watch, for example a file ID.',
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
        // Check all the webhooks which exist already if it is identical to the
        // one that is supposed to get created.
        // const app = parseInt(this.getNodeParameter('appId') as string, 10);
        // const event = this.getNodeParameter('event') as string;
        // const webhookUrlUi = this.getNodeWebhookUrl('default') as string;

        // let endpoint = `/webhooks/v1/${app}/settings`;
        // const { webhookUrl , appId } = await googleApiRequest.call(this, 'GET', endpoint, {});
        // endpoint = `/webhooks/v1/${app}/subscriptions`;
        // const subscriptions = await googleApiRequest.call(this, 'GET', endpoint, {});

        // for (const subscription of subscriptions) {
        //     if (webhookUrl === webhookUrlUi
        //     && appId === app
        //     && subscription.subscriptionDetails.subscriptionType === event
        //     && subscription.enabled === true) {
        //         return true;
        //     }
        // }
        return false;
      },
			async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const webhookData = this.getWorkflowStaticData('node');

        //const endpoint = `https://www.googleapis.com/drive/v3/files/1I_jvGUOcEN1-2TSmg42pM57jF6GVLixvb-KPCoeXniw/watch`;

        const { startPageToken } = await googleApiRequest.call(this, 'GET', '', {}, {}, 'https://www.googleapis.com/drive/v3/changes/startPageToken');

        const endpoint = `https://www.googleapis.com/drive/v3/changes/watch`;
        const body: IDataObject = {
            id: uuid(),
            type: 'web_hook',
            address: webhookUrl,
            expiration: moment().add('2', 'hours').valueOf(),
        };

        const { id, resourceId } = await googleApiRequest.call(this, 'POST', '', body, { pageToken: startPageToken }, endpoint);

        webhookData.webhookId = id;
        webhookData.resourceId = resourceId;

          // if (responseData.id === undefined) {
          //     // Required data is missing so was not successful
          //     return false;
          // }

          // const webhookData = this.getWorkflowStaticData('node');
          // webhookData.webhookId = responseData.id as string;
        return true;
      },
        // START OF IVAN'S WORK ------------------------

        // const resourceId = this.getNodeParameter('resourceId');
        // const resourceId = '1nqay6qM8AHzSFdhvYt7CSGDrVGGOzv0C'; // TEMP
        // const webhookUrl = this.getNodeWebhookUrl('default');

        // const endpoint = `/drive/v3/files/${resourceId}/watch`

        // const body = {
        //   id: uuid(),
        //   type: 'web_hook',
        //   address: webhookUrl,
        // };

        // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<');
        // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<');
        // console.log(endpoint);

        // const response = await googleApiRequest.call(this, 'POST', endpoint, body);

        // console.log(JSON.stringify(response, null, 2));

        // END OF IVAN'S WORK ------------------------


			async delete(this: IHookFunctions): Promise<boolean> {
				// const webhookUrl = this.getNodeWebhookUrl('default');

				// const resourceId = this.getNodeParameter('resourceId') as string;

				// const credentials = this.getCredentials('googleApi');

				// if (credentials === undefined) {
				// 	throw new Error('No credentials got returned!');
				// }

				// const scopes = [
				// 	'https://www.googleapis.com/auth/drive',
				// 	'https://www.googleapis.com/auth/drive.appdata',
				// 	'https://www.googleapis.com/auth/drive.photos.readonly',
				// ];

				// const client = await getAuthenticationClient(credentials.email as string, credentials.privateKey as string, scopes);

				// const drive = google.drive({
				// 	version: 'v3',
				// 	auth: client,
				// });

				// // Remove channel
				// const response = await drive.channels.stop({
				// 	requestBody: {
				// 		id: 'asdf-test-2',
				// 		address: webhookUrl,
				// 		resourceId,
				// 		type: 'web_hook',
				// 	}
				// });


				// console.log('...response...DELETE');
				// console.log(JSON.stringify(response, null, 2));



				// const webhookData = this.getWorkflowStaticData('node');

				// if (webhookData.webhookId !== undefined) {
				// 	const owner = this.getNodeParameter('owner') as string;
				// 	const repository = this.getNodeParameter('repository') as string;
				// 	const endpoint = `/repos/${owner}/${repository}/hooks/${webhookData.webhookId}`;
				// 	const body = {};

				// 	try {
				// 		await githubApiRequest.call(this, 'DELETE', endpoint, body);
				// 	} catch (e) {
				// 		return false;
				// 	}

				// 	// Remove from the static workflow data so that it is clear
				// 	// that no webhooks are registred anymore
				// 	delete webhookData.webhookId;
				// 	delete webhookData.webhookEvents;
				// }

				return true;
			},
		},
	};



	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();

		console.log('');
		console.log('');
		console.log('GOT WEBHOOK CALL');
		console.log(JSON.stringify(bodyData, null, 2));



		// Check if the webhook is only the ping from Github to confirm if it workshook_id
		if (bodyData.hook_id !== undefined && bodyData.action === undefined) {
			// Is only the ping and not an actual webhook call. So return 'OK'
			// but do not start the workflow.

			return {
				webhookResponse: 'OK'
			};
		}

		// Is a regular webhoook call

		// TODO: Add headers & requestPath
		const returnData: IDataObject[] = [];

		returnData.push(
			{
				body: bodyData,
				headers: this.getHeaderData(),
				query: this.getQueryData(),
			}
		);

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData)
			],
		};
	}
}
