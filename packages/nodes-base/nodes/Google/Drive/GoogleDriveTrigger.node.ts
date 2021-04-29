// import { google } from 'googleapis';

// import {
// 	IHookFunctions,
// 	IWebhookFunctions,
// } from 'n8n-core';

// import {
// 	IDataObject,
// 	INodeTypeDescription,
// 	INodeType,
// 	IWebhookResponseData,
//  NodeOperationError,
// } from 'n8n-workflow';

// import { getAuthenticationClient } from './GoogleApi';


// export class GoogleDriveTrigger implements INodeType {
// 	description: INodeTypeDescription = {
// 		displayName: 'Google Drive Trigger',
// 		name: 'googleDriveTrigger',
// 		icon: 'file:googleDrive.png',
// 		group: ['trigger'],
// 		version: 1,
// 		subtitle: '={{$parameter["owner"] + "/" + $parameter["repository"] + ": " + $parameter["events"].join(", ")}}',
// 		description: 'Starts the workflow when a file on Google Drive got changed.',
// 		defaults: {
// 			name: 'Google Drive Trigger',
// 			color: '#3f87f2',
// 		},
// 		inputs: [],
// 		outputs: ['main'],
// 		credentials: [
// 			{
// 				name: 'googleApi',
// 				required: true,
// 			}
// 		],
// 		webhooks: [
// 			{
// 				name: 'default',
// 				httpMethod: 'POST',
// 				responseMode: 'onReceived',
// 				path: 'webhook',
// 			},
// 		],
// 		properties: [
// 			{
// 				displayName: 'Resource Id',
// 				name: 'resourceId',
// 				type: 'string',
// 				default: '',
// 				required: true,
// 				placeholder: '',
// 				description: 'ID of the resource to watch, for example a file ID.',
// 			},
// 		],
// 	};

// 	// @ts-ignore (because of request)
// 	webhookMethods = {
// 		default: {
// 			async checkExists(this: IHookFunctions): Promise<boolean> {
// 				// const webhookData = this.getWorkflowStaticData('node');

// 				// if (webhookData.webhookId === undefined) {
// 				// 	// No webhook id is set so no webhook can exist
// 				// 	return false;
// 				// }

// 				// // Webhook got created before so check if it still exists
// 				// const owner = this.getNodeParameter('owner') as string;
// 				// const repository = this.getNodeParameter('repository') as string;
// 				// const endpoint = `/repos/${owner}/${repository}/hooks/${webhookData.webhookId}`;

// 				// try {
// 				// 	await githubApiRequest.call(this, 'GET', endpoint, {});
// 				// } catch (error) {
// 				// 	if (error.message.includes('[404]:')) {
// 				// 		// Webhook does not exist
// 				// 		delete webhookData.webhookId;
// 				// 		delete webhookData.webhookEvents;

// 				// 		return false;
// 				// 	}

// 				// 	// Some error occured
// 				// 	throw e;
// 				// }

// 				// If it did not error then the webhook exists
// 				// return true;
// 				return false;
// 			},
// 			async create(this: IHookFunctions): Promise<boolean> {
// 				const webhookUrl = this.getNodeWebhookUrl('default');

// 				const resourceId = this.getNodeParameter('resourceId') as string;

// 				const credentials = await this.getCredentials('googleApi');

// 				if (credentials === undefined) {
// 					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
// 				}

// 				const scopes = [
// 					'https://www.googleapis.com/auth/drive',
// 					'https://www.googleapis.com/auth/drive.appdata',
// 					'https://www.googleapis.com/auth/drive.photos.readonly',
// 				];

// 				const client = await getAuthenticationClient(credentials.email as string, credentials.privateKey as string, scopes);

// 				const drive = google.drive({
// 					version: 'v3',
// 					auth: client,
// 				});


// 				const accessToken = await client.getAccessToken();
// 				console.log('accessToken: ');
// 				console.log(accessToken);

// 				const asdf = await drive.changes.getStartPageToken();
// 				// console.log('asdf: ');
// 				// console.log(asdf);




// 				const response = await drive.changes.watch({
// 					//
// 					pageToken: asdf.data.startPageToken,
// 					requestBody: {
// 						id: 'asdf-test-2',
// 						address: webhookUrl,
// 						resourceId,
// 						type: 'web_hook',
// 						// page_token: '',
// 					}
// 				});

// 				console.log('...response...CREATE');
// 				console.log(JSON.stringify(response, null, 2));





// 				// const endpoint = `/repos/${owner}/${repository}/hooks`;

// 				// const body = {
// 				// 	name: 'web',
// 				// 	config: {
// 				// 		url: webhookUrl,
// 				// 		content_type: 'json',
// 				// 		// secret: '...later...',
// 				// 		insecure_ssl: '1', // '0' -> not allow inscure ssl | '1' -> allow insercure SSL
// 				// 	},
// 				// 	events,
// 				// 	active: true,
// 				// };


// 				// let responseData;
// 				// try {
// 				// 	responseData = await githubApiRequest.call(this, 'POST', endpoint, body);
// 				// } catch (error) {
// 				// 	if (error.message.includes('[422]:')) {
// 				// 		throw new NodeOperationError(this.getNode(), 'A webhook with the identical URL exists already. Please delete it manually on Github!');
// 				// 	}

// 				// 	throw e;
// 				// }

// 				// if (responseData.id === undefined || responseData.active !== true) {
// 				// 	// Required data is missing so was not successful
// 				// 	throw new NodeOperationError(this.getNode(), 'Github webhook creation response did not contain the expected data.');
// 				// }

// 				// const webhookData = this.getWorkflowStaticData('node');
// 				// webhookData.webhookId = responseData.id as string;
// 				// webhookData.webhookEvents = responseData.events as string[];

// 				return true;
// 			},
// 			async delete(this: IHookFunctions): Promise<boolean> {
// 				const webhookUrl = this.getNodeWebhookUrl('default');

// 				const resourceId = this.getNodeParameter('resourceId') as string;

// 				const credentials = await this.getCredentials('googleApi');

// 				if (credentials === undefined) {
// 					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
// 				}

// 				const scopes = [
// 					'https://www.googleapis.com/auth/drive',
// 					'https://www.googleapis.com/auth/drive.appdata',
// 					'https://www.googleapis.com/auth/drive.photos.readonly',
// 				];

// 				const client = await getAuthenticationClient(credentials.email as string, credentials.privateKey as string, scopes);

// 				const drive = google.drive({
// 					version: 'v3',
// 					auth: client,
// 				});

// 				// Remove channel
// 				const response = await drive.channels.stop({
// 					requestBody: {
// 						id: 'asdf-test-2',
// 						address: webhookUrl,
// 						resourceId,
// 						type: 'web_hook',
// 					}
// 				});


// 				console.log('...response...DELETE');
// 				console.log(JSON.stringify(response, null, 2));



// 				// const webhookData = this.getWorkflowStaticData('node');

// 				// if (webhookData.webhookId !== undefined) {
// 				// 	const owner = this.getNodeParameter('owner') as string;
// 				// 	const repository = this.getNodeParameter('repository') as string;
// 				// 	const endpoint = `/repos/${owner}/${repository}/hooks/${webhookData.webhookId}`;
// 				// 	const body = {};

// 				// 	try {
// 				// 		await githubApiRequest.call(this, 'DELETE', endpoint, body);
// 				// 	} catch (error) {
// 				// 		return false;
// 				// 	}

// 				// 	// Remove from the static workflow data so that it is clear
// 				// 	// that no webhooks are registred anymore
// 				// 	delete webhookData.webhookId;
// 				// 	delete webhookData.webhookEvents;
// 				// }

// 				return true;
// 			},
// 		},
// 	};



// 	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
// 		const bodyData = this.getBodyData();

// 		console.log('');
// 		console.log('');
// 		console.log('GOT WEBHOOK CALL');
// 		console.log(JSON.stringify(bodyData, null, 2));



// 		// Check if the webhook is only the ping from Github to confirm if it workshook_id
// 		if (bodyData.hook_id !== undefined && bodyData.action === undefined) {
// 			// Is only the ping and not an actual webhook call. So return 'OK'
// 			// but do not start the workflow.

// 			return {
// 				webhookResponse: 'OK'
// 			};
// 		}

// 		// Is a regular webhoook call

// 		// TODO: Add headers & requestPath
// 		const returnData: IDataObject[] = [];

// 		returnData.push(
// 			{
// 				body: bodyData,
// 				headers: this.getHeaderData(),
// 				query: this.getQueryData(),
// 			}
// 		);

// 		return {
// 			workflowData: [
// 				this.helpers.returnJsonArray(returnData)
// 			],
// 		};
// 	}
// }
