import {
	NodeConnectionType,
	type INodeProperties,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookFunctions,
} from 'n8n-workflow';

import { formWebhook } from '../utils';
import {
	appendAttributionToForm,
	formDescription,
	formFields,
	formRespondMode,
	formTitle,
	formTriggerPanel,
	respondWithOptions,
	webhookPath,
} from '../common.descriptions';
import { FORM_TRIGGER_AUTHENTICATION_PROPERTY } from '../interfaces';

const useWorkflowTimezone: INodeProperties = {
	displayName: 'Use Workflow Timezone',
	name: 'useWorkflowTimezone',
	type: 'boolean',
	default: false,
	description: "Whether to use the workflow timezone set in node's settings rather than UTC",
};

const descriptionV2: INodeTypeDescription = {
	displayName: 'n8n Form Trigger',
	name: 'formTrigger',
	icon: 'file:form.svg',
	group: ['trigger'],
	version: [2, 2.1],
	description: 'Runs the flow when an n8n generated webform is submitted',
	defaults: {
		name: 'n8n Form Trigger',
	},

	inputs: [],
	outputs: [NodeConnectionType.Main],
	webhooks: [
		{
			name: 'setup',
			httpMethod: 'GET',
			responseMode: 'onReceived',
			isFullPath: true,
			path: '={{$parameter["path"]}}',
			ndvHideUrl: true,
			isForm: true,
		},
		{
			name: 'default',
			httpMethod: 'POST',
			responseMode: '={{$parameter["responseMode"]}}',
			responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
			isFullPath: true,
			path: '={{$parameter["path"]}}',
			ndvHideMethod: true,
			isForm: true,
		},
	],
	eventTriggerDescription: 'Waiting for you to submit the form',
	activationMessage: 'You can now make calls to your production Form URL.',
	triggerPanel: formTriggerPanel,
	credentials: [
		{
			// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
			name: 'httpBasicAuth',
			required: true,
			displayOptions: {
				show: {
					[FORM_TRIGGER_AUTHENTICATION_PROPERTY]: ['basicAuth'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: FORM_TRIGGER_AUTHENTICATION_PROPERTY,
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
		},
		webhookPath,
		formTitle,
		formDescription,
		formFields,
		formRespondMode,
		{
			displayName:
				"In the 'Respond to Webhook' node, select 'Respond With JSON' and set the <strong>formSubmittedText</strong> key to display a custom response in the form, or the <strong>redirectURL</strong> key to redirect users to a URL",
			name: 'formNotice',
			type: 'notice',
			displayOptions: {
				show: { responseMode: ['responseNode'] },
			},
			default: '',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				appendAttributionToForm,
				{
					...respondWithOptions,
					displayOptions: {
						hide: {
							'/responseMode': ['responseNode'],
						},
					},
				},
				{
					displayName: 'Ignore Bots',
					name: 'ignoreBots',
					type: 'boolean',
					default: false,
					description: 'Whether to ignore requests from bots like link previewers and web crawlers',
				},
				{
					...useWorkflowTimezone,
					default: false,
					displayOptions: {
						show: {
							'@version': [2],
						},
					},
				},
				{
					...useWorkflowTimezone,
					default: true,
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gt: 2 } }],
						},
					},
				},
			],
		},
	],
};

export class FormTriggerV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...descriptionV2,
		};
	}

	async webhook(this: IWebhookFunctions) {
		return await formWebhook(this);
	}
}
