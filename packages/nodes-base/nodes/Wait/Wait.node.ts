import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeProperties,
	IDisplayOptions,
	IWebhookFunctions,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	WAIT_INDEFINITELY,
	FORM_TRIGGER_NODE_TYPE,
	tryToParseDateTime,
	NodeOperationError,
} from 'n8n-workflow';

import { validateWaitAmount, validateWaitUnit } from './validation';
import { updateDisplayOptions } from '../../utils/utilities';
import {
	formDescription,
	formFields,
	respondWithOptions,
	formRespondMode,
	formTitle,
	appendAttributionToForm,
} from '../Form/common.descriptions';
import { formWebhook } from '../Form/utils/utils';
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

const toWaitAmount: INodeProperties = {
	displayName: 'Wait Amount',
	name: 'amount',
	type: 'number',
	typeOptions: {
		minValue: 0,
		numberPrecision: 2,
	},
	default: 1,
	description: 'The time to wait',
	validateType: 'number',
};

const unitSelector: INodeProperties = {
	displayName: 'Wait Unit',
	name: 'unit',
	type: 'options',
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
};

const waitTimeProperties: INodeProperties[] = [
	{
		displayName: 'Limit Wait Time',
		name: 'limitWaitTime',
		type: 'boolean',
		default: false,
		description:
			'Whether to limit the time this node should wait for a user response before execution resumes',
		displayOptions: {
			show: {
				resume: ['webhook', 'form'],
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
				resume: ['webhook', 'form'],
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
				resume: ['webhook', 'form'],
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
				resume: ['webhook', 'form'],
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
				resume: ['webhook', 'form'],
			},
		},
		default: '',
		description: 'Continue execution after the specified date and time',
	},
];

const webhookSuffix: INodeProperties = {
	displayName: 'Webhook Suffix',
	name: 'webhookSuffix',
	type: 'string',
	default: '',
	placeholder: 'webhook',
	noDataExpression: true,
	description:
		'This suffix path will be appended to the restart URL. Helpful when using multiple wait nodes.',
};

const displayOnWebhook: IDisplayOptions = {
	show: {
		resume: ['webhook'],
	},
};

const displayOnFormSubmission = {
	show: {
		resume: ['form'],
	},
};

const onFormSubmitProperties = updateDisplayOptions(displayOnFormSubmission, [
	formTitle,
	formDescription,
	formFields,
	formRespondMode,
]);

const onWebhookCallProperties = updateDisplayOptions(displayOnWebhook, [
	{
		...httpMethodsProperty,
		description: 'The HTTP method of the Webhook call',
	},
	responseCodeProperty,
	responseModeProperty,
	responseDataProperty,
	responseBinaryPropertyNameProperty,
]);

const webhookPath = '={{$parameter["options"]["webhookSuffix"] || ""}}';

export class Wait extends Webhook {
	authPropertyName = 'incomingAuthentication';

	description: INodeTypeDescription = {
		displayName: 'Wait',
		name: 'wait',
		icon: 'fa:pause-circle',
		iconColor: 'crimson',
		group: ['organization'],
		version: [1, 1.1],
		description: 'Wait before continue with execution',
		defaults: {
			name: 'Wait',
			color: '#804050',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: credentialsProperty(this.authPropertyName),
		webhooks: [
			{
				...defaultWebhookDescription,
				responseData: '={{$parameter["responseData"]}}',
				path: webhookPath,
				restartWebhook: true,
			},
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: webhookPath,
				restartWebhook: true,
				isFullPath: true,
				nodeType: 'form',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
				path: webhookPath,
				restartWebhook: true,
				isFullPath: true,
				nodeType: 'form',
			},
		],
		properties: [
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
					{
						name: 'On Form Submitted',
						value: 'form',
						description: 'Waits for a form submission before continuing',
					},
				],
				default: 'timeInterval',
				description: 'Determines the waiting mode to use before the workflow continues',
			},
			{
				displayName: 'Authentication',
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
				description:
					'If and how incoming resume-webhook-requests to $execution.resumeFormUrl should be authenticated for additional security',
				displayOptions: {
					show: {
						resume: ['form'],
					},
				},
			},
			{
				...authenticationProperty(this.authPropertyName),
				description:
					'If and how incoming resume-webhook-requests to $execution.resumeUrl should be authenticated for additional security',
				displayOptions: displayOnWebhook,
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
				required: true,
			},

			// ----------------------------------
			//         resume:timeInterval
			// ----------------------------------
			{
				...toWaitAmount,
				displayOptions: {
					show: {
						resume: ['timeInterval'],
						'@version': [1],
					},
				},
			},
			{
				...toWaitAmount,
				default: 5,
				displayOptions: {
					show: {
						resume: ['timeInterval'],
					},
					hide: {
						'@version': [1],
					},
				},
			},
			{
				...unitSelector,
				displayOptions: {
					show: {
						resume: ['timeInterval'],
						'@version': [1],
					},
				},
			},
			{
				...unitSelector,
				default: 'seconds',
				displayOptions: {
					show: {
						resume: ['timeInterval'],
					},
					hide: {
						'@version': [1],
					},
				},
			},

			// ----------------------------------
			//         resume:webhook & form
			// ----------------------------------
			{
				displayName:
					'The webhook URL will be generated at run time. It can be referenced with the <strong>$execution.resumeUrl</strong> variable. Send it somewhere before getting to this node. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.wait" target="_blank">More info</a>',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: displayOnWebhook,
				default: '',
			},
			{
				displayName:
					'The form url will be generated at run time. It can be referenced with the <strong>$execution.resumeFormUrl</strong> variable. Send it somewhere before getting to this node. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.wait" target="_blank">More info</a>',
				name: 'formNotice',
				type: 'notice',
				displayOptions: displayOnFormSubmission,
				default: '',
			},
			...onFormSubmitProperties,
			...onWebhookCallProperties,
			...waitTimeProperties,
			{
				...optionsProperty,
				displayOptions: displayOnWebhook,
				options: [...(optionsProperty.options as INodeProperties[]), webhookSuffix],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resume: ['form'],
					},
					hide: {
						responseMode: ['responseNode'],
					},
				},
				options: [appendAttributionToForm, respondWithOptions, webhookSuffix],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resume: ['form'],
					},
					hide: {
						responseMode: ['onReceived', 'lastNode'],
					},
				},
				options: [appendAttributionToForm, webhookSuffix],
			},
		],
	};

	async webhook(context: IWebhookFunctions) {
		const resume = context.getNodeParameter('resume', 0) as string;
		if (resume === 'form') return await formWebhook(context, this.authPropertyName);
		return await super.webhook(context);
	}

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resume = context.getNodeParameter('resume', 0) as string;

		if (['webhook', 'form'].includes(resume)) {
			let hasFormTrigger = false;

			if (resume === 'form') {
				const parentNodes = context.getParentNodes(context.getNode().name);
				hasFormTrigger = parentNodes.some((node) => node.type === FORM_TRIGGER_NODE_TYPE);
			}

			const returnData = await this.configureAndPutToWait(context);

			if (resume === 'form' && hasFormTrigger) {
				context.sendResponse({
					headers: {
						location: context.evaluateExpression('{{ $execution.resumeFormUrl }}', 0),
					},
					statusCode: 307,
				});
			}

			return returnData;
		}

		let waitTill: Date;
		if (resume === 'timeInterval') {
			const unit = context.getNodeParameter('unit', 0);

			if (!validateWaitUnit(unit)) {
				throw new NodeOperationError(
					context.getNode(),
					"Invalid wait unit. Valid units are 'seconds', 'minutes', 'hours', or 'days'.",
				);
			}

			let waitAmount = context.getNodeParameter('amount', 0);

			if (!validateWaitAmount(waitAmount)) {
				throw new NodeOperationError(
					context.getNode(),
					'Invalid wait amount. It must be a positive number.',
				);
			}

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

			// Timezone does not change relative dates, since they are just
			// a number of seconds added to the current timestamp
			waitTill = new Date(new Date().getTime() + waitAmount);
		} else {
			try {
				const dateTimeStrRaw = context.getNodeParameter('dateTime', 0);
				const parsedDateTime = tryToParseDateTime(dateTimeStrRaw, context.getTimezone());

				waitTill = parsedDateTime.toUTC().toJSDate();
			} catch (e) {
				throw new NodeOperationError(
					context.getNode(),
					'Cannot put execution to wait because `dateTime` parameter is not a valid date. Please pick a specific date and time to wait until.',
				);
			}
		}

		const waitValue = Math.max(waitTill.getTime() - new Date().getTime(), 0);

		if (waitValue < 65000) {
			// If wait time is shorter than 65 seconds leave execution active because
			// we just check the database every 60 seconds.
			return await new Promise((resolve) => {
				const timer = setTimeout(() => resolve([context.getInputData()]), waitValue);
				context.onExecutionCancellation(() => clearTimeout(timer));
			});
		}

		// If longer than 65 seconds put execution to wait
		return await this.putToWait(context, waitTill);
	}

	private async configureAndPutToWait(context: IExecuteFunctions) {
		let waitTill = WAIT_INDEFINITELY;
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

		return await this.putToWait(context, waitTill);
	}

	private async putToWait(context: IExecuteFunctions, waitTill: Date) {
		await context.putExecutionToWait(waitTill);
		return [context.getInputData()];
	}
}
