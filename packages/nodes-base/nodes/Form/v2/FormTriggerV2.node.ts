import {
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookFunctions,
} from 'n8n-workflow';

import { formTriggerDescription } from '../description';
import { formWebhook } from '../utils';

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
			responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
			isFullPath: true,
			path: '={{$parameter["path"]}}',
			ndvHideMethod: true,
			isForm: true,
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
		return formWebhook(this);
	}
}
