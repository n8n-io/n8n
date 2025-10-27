import {
	ADD_FORM_NOTICE,
	type INodePropertyOptions,
	NodeConnectionTypes,
	type INodeProperties,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookFunctions,
} from 'n8n-workflow';

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
import { cssVariables } from '../cssVariables';
import { FORM_TRIGGER_AUTHENTICATION_PROPERTY } from '../interfaces';
import { formWebhook } from '../utils/utils';

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
	// since trigger and node are sharing descriptions and logic we need to sync the versions
	// and keep them aligned in both nodes
	version: [2, 2.1, 2.2, 2.3],
	description: 'Generate webforms in n8n and pass their responses to the workflow',
	defaults: {
		name: 'On form submission',
	},

	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	webhooks: [
		{
			name: 'setup',
			httpMethod: 'GET',
			responseMode: 'onReceived',
			isFullPath: true,
			path: '={{ $parameter["path"] || $parameter["options"]?.path || $webhookId }}',
			ndvHideUrl: true,
			nodeType: 'form',
		},
		{
			name: 'default',
			httpMethod: 'POST',
			responseMode: '={{$parameter["responseMode"]}}',
			responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
			isFullPath: true,
			path: '={{ $parameter["path"] || $parameter["options"]?.path || $webhookId }}',
			ndvHideMethod: true,
			nodeType: 'form',
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
		{ ...webhookPath, displayOptions: { show: { '@version': [{ _cnd: { lte: 2.1 } }] } } },
		formTitle,
		formDescription,
		formFields,
		{ ...formRespondMode, displayOptions: { show: { '@version': [{ _cnd: { lte: 2.1 } }] } } },
		{
			...formRespondMode,
			options: (formRespondMode.options as INodePropertyOptions[])?.filter(
				(option) => option.value !== 'responseNode',
			),
			displayOptions: { show: { '@version': [{ _cnd: { gte: 2.2 } }] } },
		},
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
		// notice would be shown if no Form node was connected to trigger
		{
			displayName: 'Build multi-step forms by adding a form page later in your workflow',
			name: ADD_FORM_NOTICE,
			type: 'notice',
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
					displayName: 'Button Label',
					description: 'The label of the submit button in the form',
					name: 'buttonLabel',
					type: 'string',
					default: 'Submit',
				},
				{
					...webhookPath,
					required: false,
					displayOptions: { show: { '@version': [{ _cnd: { gte: 2.2 } }] } },
				},
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
					description: "Whether to use the workflow timezone in 'submittedAt' field or UTC",
					displayOptions: {
						show: {
							'@version': [2],
						},
					},
				},
				{
					...useWorkflowTimezone,
					default: true,
					description: "Whether to use the workflow timezone in 'submittedAt' field or UTC",
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gt: 2 } }],
						},
					},
				},
				{
					displayName: 'Custom Form Styling',
					name: 'customCss',
					type: 'string',
					typeOptions: {
						rows: 10,
						editor: 'cssEditor',
					},
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gt: 2 } }],
						},
					},
					default: cssVariables.trim(),
					description: 'Override default styling of the public form interface with CSS',
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
