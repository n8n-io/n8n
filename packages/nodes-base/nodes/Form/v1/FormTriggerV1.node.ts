import {
	FORM_TRIGGER_PATH_IDENTIFIER,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type NodeFeatures,
} from 'n8n-workflow';

import {
	formDescription,
	formFields,
	formRespondMode,
	formTitle,
	formTriggerPanel,
	webhookPath,
} from '../common.descriptions';
import { formWebhook } from '../utils/utils';

const descriptionV1: INodeTypeDescription = {
	displayName: 'n8n Form Trigger',
	name: 'formTrigger',
	icon: 'file:form.svg',
	group: ['trigger'],
	version: 1,
	description: 'Generate webforms in n8n and pass their responses to the workflow',
	defaults: {
		name: 'n8n Form Trigger',
	},

	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	webhooks: [
		{
			name: 'setup',
			httpMethod: 'GET',
			responseMode: 'onReceived',
			isFullPath: true,
			path: `={{$parameter["path"]}}/${FORM_TRIGGER_PATH_IDENTIFIER}`,
			ndvHideUrl: true,
		},
		{
			name: 'default',
			httpMethod: 'POST',
			responseMode: '={{$parameter["responseMode"]}}',
			responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
			isFullPath: true,
			path: `={{$parameter["path"]}}/${FORM_TRIGGER_PATH_IDENTIFIER}`,
			ndvHideMethod: true,
		},
	],
	eventTriggerDescription: 'Waiting for you to submit the form',
	activationMessage: 'You can now make calls to your production Form URL.',
	triggerPanel: formTriggerPanel,
	properties: [
		webhookPath,
		formTitle,
		formDescription,
		formFields,
		formRespondMode,
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: {
				hide: {
					responseMode: ['responseNode'],
				},
			},
			options: [
				{
					displayName: 'Form Submitted Text',
					name: 'formSubmittedText',
					description: 'The text displayed to users after they filled the form',
					type: 'string',
					default: 'Your response has been recorded',
				},
			],
		},
	],
};

export class FormTriggerV1 implements INodeType {
	description: INodeTypeDescription;

	/**
	 * Defines feature flags for a given node version.
	 * Version 1 has all features disabled or set to defaults.
	 * Can access version and implement any logic needed to determine features.
	 */
	defineFeatures(_version: number): NodeFeatures {
		return {
			requireAuth: false, // v1 doesn't require auth
			defaultUseWorkflowTimezone: false, // v1 doesn't default to workflow timezone
			allowRespondToWebhook: true, // v1 allows respond to webhook
			useFieldName: false, // v1 uses fieldLabel
			useFieldLabel: true, // v1 uses fieldLabel
			useWebhookPath: false, // not used in v1
			useWebhookPathInOptions: false, // not used in v1
			useResponseNodeOption: false, // v1 doesn't hide responseNode option
			useWorkflowTimezone: false, // v1 is not v2
			useLegacyMultiselect: true, // v1 shows multiselect (true for v1)
		};
	}

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...descriptionV1,
		};
	}

	async webhook(this: IWebhookFunctions) {
		return await formWebhook(this);
	}
}
