import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';
import { WAIT_TIME_UNLIMITED } from 'n8n-workflow';

import {
	authenticationProperty,
	credentialsProperty,
	defaultWebhookDescription,
	httpMethodsProperty,
	optionsProperty,
	responseBinaryPropertyNameProperty,
	responseCodeProperty,
	responseDataProperty,
	responseModeProperty,
} from '../Webhook/description';
import { Webhook } from '../Webhook/Webhook.node';

const authPropertyName = 'incomingAuthentication';

export class Wait extends Webhook {
	description: INodeTypeDescription = {
		displayName: 'Wait',
		name: 'wait',
		icon: 'fa:pause-circle',
		group: ['organization'],
		version: 1,
		description: 'Wait before continue with execution',
		defaults: {
			name: 'Wait',
			color: '#804050',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: credentialsProperty(authPropertyName),
		webhooks: [
			{
				...defaultWebhookDescription,
				responseData: '={{$parameter["responseData"]}}',
				path: '={{$parameter["options"]["webhookSuffix"] || ""}}',
				restartWebhook: true,
			},
		],
		properties: [
			{
				...authenticationProperty(authPropertyName),
				description:
					'If and how incoming resume-webhook-requests to $execution.resumeUrl should be authenticated for additional security',
			},
			{
				displayName: 'Resume',
				name: 'resume',
				type: 'options',
				options: [
					{
						name: 'After Time Interval',
						value: 'timeInterval',
						description: 'Waits for a certain amount of time',
					},
					{
						name: 'At Specified Time',
						value: 'specificTime',
						description: 'Waits until a specific date and time to continue',
					},
					{
						name: 'On Webhook Call',
						value: 'webhook',
						description: 'Waits for a webhook call before continuing',
					},
				],
				default: 'timeInterval',
				description: 'Determines the waiting mode to use before the workflow continues',
			},

			// ----------------------------------
			//         resume:specificTime
			// ----------------------------------
			{
				displayName: 'Date and Time',
				name: 'dateTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						resume: ['specificTime'],
					},
				},
				default: '',
				description: 'The date and time to wait for before continuing',
			},

			// ----------------------------------
			//         resume:timeInterval
			// ----------------------------------
			{
				displayName: 'Wait Amount',
				name: 'amount',
				type: 'number',
				displayOptions: {
					show: {
						resume: ['timeInterval'],
					},
				},
				typeOptions: {
					minValue: 0,
					numberPrecision: 2,
				},
				default: 1,
				description: 'The time to wait',
			},
			{
				displayName: 'Wait Unit',
				name: 'unit',
				type: 'options',
				displayOptions: {
					show: {
						resume: ['timeInterval'],
					},
				},
				options: [
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
					{
						name: 'Days',
						value: 'days',
					},
				],
				default: 'hours',
				description: 'The time unit of the Wait Amount value',
			},

			// ----------------------------------
			//         resume:webhook
			// ----------------------------------
			{
				displayName:
					'The webhook URL will be generated at run time. It can be referenced with the <strong>$execution.resumeUrl</strong> variable. Send it somewhere before getting to this node. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.wait" target="_blank">More info</a>',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						resume: ['webhook'],
					},
				},
				default: '',
			},
			{
				...httpMethodsProperty,
				displayOptions: {
					show: {
						resume: ['webhook'],
					},
				},
				description: 'The HTTP method of the Webhook call',
			},
			{
				...responseCodeProperty,
				displayOptions: {
					show: {
						resume: ['webhook'],
					},
				},
			},
			{
				...responseModeProperty,
				displayOptions: {
					show: {
						resume: ['webhook'],
					},
				},
			},
			{
				...responseDataProperty,
				displayOptions: {
					show: {
						...responseDataProperty.displayOptions?.show,
						resume: ['webhook'],
					},
				},
			},
			{
				...responseBinaryPropertyNameProperty,
				displayOptions: {
					show: {
						...responseBinaryPropertyNameProperty.displayOptions?.show,
						resume: ['webhook'],
					},
				},
			},
			{
				displayName: 'Limit Wait Time',
				name: 'limitWaitTime',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'If no webhook call is received, the workflow will automatically resume execution after the specified limit type',
				displayOptions: {
					show: {
						resume: ['webhook'],
					},
				},
			},
			{
				displayName: 'Limit Type',
				name: 'limitType',
				type: 'options',
				default: 'afterTimeInterval',
				description:
					'Sets the condition for the execution to resume. Can be a specified date or after some time.',
				displayOptions: {
					show: {
						limitWaitTime: [true],
						resume: ['webhook'],
					},
				},
				options: [
					{
						name: 'After Time Interval',
						description: 'Waits for a certain amount of time',
						value: 'afterTimeInterval',
					},
					{
						name: 'At Specified Time',
						description: 'Waits until the set date and time to continue',
						value: 'atSpecifiedTime',
					},
				],
			},
			{
				displayName: 'Amount',
				name: 'resumeAmount',
				type: 'number',
				displayOptions: {
					show: {
						limitType: ['afterTimeInterval'],
						limitWaitTime: [true],
						resume: ['webhook'],
					},
				},
				typeOptions: {
					minValue: 0,
					numberPrecision: 2,
				},
				default: 1,
				description: 'The time to wait',
			},
			{
				displayName: 'Unit',
				name: 'resumeUnit',
				type: 'options',
				displayOptions: {
					show: {
						limitType: ['afterTimeInterval'],
						limitWaitTime: [true],
						resume: ['webhook'],
					},
				},
				options: [
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
					{
						name: 'Days',
						value: 'days',
					},
				],
				default: 'hours',
				description: 'Unit of the interval value',
			},
			{
				displayName: 'Max Date and Time',
				name: 'maxDateAndTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						limitType: ['atSpecifiedTime'],
						limitWaitTime: [true],
						resume: ['webhook'],
					},
				},
				default: '',
				description: 'Continue execution after the specified date and time',
			},
			{
				...optionsProperty,
				options: [
					...(optionsProperty.options as INodeProperties[]),
					{
						displayName: 'Webhook Suffix',
						name: 'webhookSuffix',
						type: 'string',
						default: '',
						placeholder: 'webhook',
						description:
							'This suffix path will be appended to the restart URL. Helpful when using multiple wait nodes. Note: Does not support expressions.',
					},
				],
			},
		],
	};

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resume = context.getNodeParameter('resume', 0) as string;

		if (resume === 'webhook') {
			return this.handleWebhookResume(context);
		}

		let waitTill: Date;
		if (resume === 'timeInterval') {
			const unit = context.getNodeParameter('unit', 0) as string;

			let waitAmount = context.getNodeParameter('amount', 0) as number;
			if (unit === 'minutes') {
				waitAmount *= 60;
			}
			if (unit === 'hours') {
				waitAmount *= 60 * 60;
			}
			if (unit === 'days') {
				waitAmount *= 60 * 60 * 24;
			}

			waitAmount *= 1000;

			waitTill = new Date(new Date().getTime() + waitAmount);
		} else {
			// resume: dateTime
			const dateTime = context.getNodeParameter('dateTime', 0) as string;

			waitTill = new Date(dateTime);
		}

		const waitValue = Math.max(waitTill.getTime() - new Date().getTime(), 0);

		if (waitValue < 65000) {
			// If wait time is shorter than 65 seconds leave execution active because
			// we just check the database every 60 seconds.
			return new Promise((resolve, _reject) => {
				setTimeout(() => {
					resolve([context.getInputData()]);
				}, waitValue);
			});
		}

		// If longer than 65 seconds put execution to wait
		return this.putToWait(context, waitTill);
	}

	private async handleWebhookResume(context: IExecuteFunctions) {
		let waitTill = new Date(WAIT_TIME_UNLIMITED);

		const limitWaitTime = context.getNodeParameter('limitWaitTime', 0);

		if (limitWaitTime === true) {
			const limitType = context.getNodeParameter('limitType', 0);
			if (limitType === 'afterTimeInterval') {
				let waitAmount = context.getNodeParameter('resumeAmount', 0) as number;
				const resumeUnit = context.getNodeParameter('resumeUnit', 0);
				if (resumeUnit === 'minutes') {
					waitAmount *= 60;
				}
				if (resumeUnit === 'hours') {
					waitAmount *= 60 * 60;
				}
				if (resumeUnit === 'days') {
					waitAmount *= 60 * 60 * 24;
				}

				waitAmount *= 1000;

				waitTill = new Date(new Date().getTime() + waitAmount);
			} else {
				waitTill = new Date(context.getNodeParameter('maxDateAndTime', 0) as string);
			}
		}

		return this.putToWait(context, waitTill);
	}

	private async putToWait(context: IExecuteFunctions, waitTill: Date) {
		await context.putExecutionToWait(waitTill);
		return [context.getInputData()];
	}
}
