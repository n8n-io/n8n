import { PubSub } from '@google-cloud/pubsub';
import { GoogleAuth } from 'google-auth-library';
import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

export class GooglePubSubTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Pub/Sub',
		name: 'googlePubSub',
		icon: 'file:googlePubSubTrigger.png',
		group: ['trigger'],
		version: 1,
		description: 'Listens to Google Pub/Sub messages',
		defaults: {
			name: 'Google Pub/Sub',
			color: '#1A73E8',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
			}
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Project Id.',
				name: 'projectId',
				type: 'string',
				default: '',
				description: 'Google Cloud project id.',
				required: true,
			},
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				description: 'Name of the Google Pub/Sub topic to listen to.',
				required: true,
			},
			{
				displayName: 'Subscription',
				name: 'subscription',
				type: 'string',
				default: '',
				description: 'Name of the Google Pub/Sub subscription for this topic and node. It will be created if it doesn\'t exist.',
				required: true,
			},
			{
				displayName: 'Decode JSON',
				name: 'decodeJSON',
				type: 'boolean',
				default: false,
				description: 'If your message data is in JSON, enable this option to decode it automatically.',
			},
		],
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {

		const credentials = this.getCredentials('googleApi');
		if (!credentials) {
			throw new Error('Credentials are mandatory!');
		}
		const auth = new GoogleAuth({
			credentials: {
				client_email: credentials.email as string,
				private_key: credentials.privateKey as string,
			}
		});

		const projectId = this.getNodeParameter('projectId') as string;
		const topic = this.getNodeParameter('topic') as string;
		const subscriptionName = this.getNodeParameter('subscription') as string;
		const decodeJSON = this.getNodeParameter('decodeJSON') as boolean;

		const pubsub = new PubSub({ projectId, auth });

		const subscription = pubsub.topic(topic).subscription(subscriptionName);
		if ((await subscription.exists())[0] === false) {
			await subscription.create();
		}

		subscription.on('message', (message) => {
			const decodedData = message.data.toString('utf-8');
			this.emit([this.helpers.returnJsonArray([{
				id: message.id,
				data: decodeJSON ? JSON.parse(decodedData) : decodedData,
				attributes: message.attributes,
			}])]);
			message.ack();
		});

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			await subscription.close();
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually.
		// for Pub/Sub it doesn't make much sense to wait here but
		// for a new user who doesn't know how this works, it's better to wait and show a respective info message
		async function manualTriggerFunction() {
			await new Promise(( resolve, reject ) => {
				const timeoutHandler = setTimeout(() => {
					reject(new Error('Aborted, no message received within 30secs. This 30sec timeout is only set for "manually triggered execution". Active Workflows will listen indefinitely.'));
				}, 30000);
				subscription.on('message', () => {
					clearTimeout(timeoutHandler);
					resolve(true);
				});
			});
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};

	}
}
