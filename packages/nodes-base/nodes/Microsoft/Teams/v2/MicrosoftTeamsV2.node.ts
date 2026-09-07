import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
} from 'n8n-workflow';

import { sendAndWaitWebhook } from '@utils/sendAndWait/utils';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch } from './methods';

export class MicrosoftTeamsV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
			usableAsTool: true,
		};
	}

	methods = { listSearch };

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
