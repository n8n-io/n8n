import {
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookFunctions,
} from 'n8n-workflow';

import { formTriggerDescription } from '../description';
import { formWebhook } from '../utils';

const descriptionV1 = formTriggerDescription;

export class FormTriggerV1 implements INodeType {
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
