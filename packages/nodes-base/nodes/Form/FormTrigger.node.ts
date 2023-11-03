import type {
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IVersionedNodeType,
	IWebhookFunctions,
} from 'n8n-workflow';
import { FORM_TRIGGER_PATH_IDENTIFIER, VersionedNodeType } from 'n8n-workflow';

import {
	formDescription,
	formFields,
	formOptions,
	formRespondMode,
	formTitle,
	formTriggerPanel,
	webhookPath,
} from './description';

import { formWebhook } from './utils';

const formTriggerDescription: INodeTypeDescription = {
	displayName: 'n8n Form Trigger',
	name: 'formTrigger',
	icon: 'file:form.svg',
	group: ['trigger'],
	version: 1,
	description: 'Runs the flow when an n8n generated webform is submitted',
	defaults: {
		name: 'n8n Form Trigger',
	},
	inputs: [],
	outputs: ['main'],
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
			isFullPath: true,
			path: `={{$parameter["path"]}}/${FORM_TRIGGER_PATH_IDENTIFIER}`,
			ndvHideMethod: true,
		},
	],
	eventTriggerDescription: 'Waiting for you to submit the form',
	activationMessage: 'You can now make calls to your production Form URL.',
	triggerPanel: formTriggerPanel,
	properties: [webhookPath, formTitle, formDescription, formFields, formRespondMode, formOptions],
};

const descriptionV1: INodeTypeDescription = formTriggerDescription;

const descriptionV2: INodeTypeDescription = {
	...formTriggerDescription,
	version: 2,
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
			isFullPath: true,
			path: '={{$parameter["path"]}}',
			ndvHideMethod: true,
			isForm: true,
		},
	],
};

class FormTriggerV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...descriptionV1,
		};
	}

	async webhook(this: IWebhookFunctions) {
		return formWebhook(this);
	}
}

class FormTriggerV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...descriptionV2,
		};
	}

	async webhook(this: IWebhookFunctions) {
		return formWebhook(this);
	}
}

export class FormTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'n8n Form Trigger',
			name: 'formTrigger',
			icon: 'file:form.svg',
			group: ['trigger'],
			description: 'Runs the flow when an n8n generated webform is submitted',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new FormTriggerV1(baseDescription),
			2: new FormTriggerV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
