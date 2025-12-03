import {
	FORM_TRIGGER_PATH_IDENTIFIER,
	NodeConnectionTypes,
	type FeatureCondition,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookFunctions,
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
	 * Feature definitions - declarative version conditions for each feature.
	 * Version 1 has all features disabled or set to defaults.
	 * Note: These conditions define when features are ENABLED (true).
	 * For v1, most features are disabled, so we use conditions that evaluate to false for v1.
	 */
	features: Record<string, FeatureCondition | boolean> = {
		requireAuth: false, // v1 doesn't require auth
		defaultUseWorkflowTimezone: false, // v1 doesn't default to workflow timezone
		allowRespondToWebhook: true, // v1 allows respond to webhook
		useFieldName: false, // v1 uses fieldLabel
		showWebhookPath: { lte: 2.1 }, // v1 and v2.1 show in main (true for v1)
		showWebhookPathInOptions: { gte: 2.2 }, // v2.2+ shows in options (false for v1)
	};

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
