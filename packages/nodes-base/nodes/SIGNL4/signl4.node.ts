import {IExecuteFunctions,} from 'n8n-core';
import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,} from 'n8n-workflow';
import {SIGNL4ApiRequest} from './GenericFunctions';

export class SIGNL4 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SIGNL4',
		name: 'SIGNL4',
		icon: 'file:signl4.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send SIGNL4 alert. Find our more at https://www.signl4.com.',
		defaults: {
			name: 'SIGNL4',
			color: '#0000FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'SIGNL4Api',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Alert',
						value: 'alert',
					},
				],
				default: 'alert',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'alert',
						],
					},
				},
				options: [
					{
						name: 'Send Alert',
						value: 'send',
						description: 'Send SIGNL4 alert.',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: 'SIGNL4 Alert',
				placeholder: 'SIGNL4 Alert',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'alert',
						],
					},
				},
				description: 'The subject of the SIGNL4 alert.',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				placeholder: 'Alert description.',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'alert',
						],
					},
				},
				description: 'A more detailed description for the alert.',
			},
			{
				displayName: 'S4-Service',
				name: 'xS4Service',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'alert',
						],
					},
				},
				description: 'Assigns the alert to the service/system category with the specified name.',
			},
			{
				displayName: 'S4-Location',
				name: 'xS4Location',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'alert',
						],
					},
				},
				description: 'Transmit location information (\'latitude, longitude\') with your event and display a map in the mobile app.',
			},
			{
				displayName: 'S4-AlertingScenario',
				name: 'xS4AlertingScenario',
				type: 'options',
				options: [
					{
						name: 'single_ack',
						value: 'single_ack',
					},
					{
						name: 'multi_ack',
						value: 'multi_ack',
					},
				],
				default: 'single_ack',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'alert',
						],
					},
				},
				description: 'Pass \'single_ack\' if only one person needs to confirm this Signl. Pass \'multi_ack\' in case this alert must be confirmed by the number of people who are on duty at the time this Singl is raised.',
			},
			{
				displayName: 'S4-ExternalID',
				name: 'xS4ExternalId',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'alert',
						],
					},
				},
				description: 'If the event originates from a record in a 3rd party system, use this parameter to pass the unique ID of that record. That ID will be communicated in outbound webhook notifications from SIGNL4, which is great for correlation/synchronization of that record with the alert.',
			},
			{
				displayName: 'S4-Filtering',
				name: 'xS4Filtering',
				type: 'boolean',
				default: 'false',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'alert',
						],
					},
				},
				description: 'Specify a boolean value of true or false to apply event filtering for this event, or not. If set to true, the event will only trigger a notification to the team, if it contains at least one keyword from one of your services and system categories (i.e. it is whitelisted)',
			}			
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];

		for (let i = 0; i < this.getInputData().length; i++) {
			const resource = this.getNodeParameter('resource', i);
			if ('alert' !== resource) {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const operation = this.getNodeParameter('operation', i);
			if ('send' !== operation) {
				throw new Error(`The operation "${operation}" is not known!`);
			}
			
			// Assemble JSON data
			var message = {
				Subject: this.getNodeParameter('subject', i),
				Body: this.getNodeParameter('body', i)
			} as IDataObject;
			message['X-S4-Service'] = this.getNodeParameter('xS4Service', i);
			message['X-S4-Location'] = this.getNodeParameter('xS4Location', i);
			message['X-S4-AlertingScenario'] = this.getNodeParameter('xS4AlertingScenario', i);
			message['X-S4-ExternalID'] = this.getNodeParameter('xS4ExternalId', i);
			message['X-S4-Filtering'] = this.getNodeParameter('xS4Filtering', i);

			const responseData = await SIGNL4ApiRequest.call(this, message);

			returnData.push(responseData);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
