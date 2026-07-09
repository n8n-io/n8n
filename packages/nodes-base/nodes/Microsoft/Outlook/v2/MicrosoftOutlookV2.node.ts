import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { description } from './actions/node.description';
import { router } from './actions/router';
import { loadOptions, listSearch } from './methods';
import { sendAndWaitWebhook } from '../../../../utils/sendAndWait/utils';

export class MicrosoftOutlookV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...description,
		};
	}

	methods = { loadOptions, listSearch };

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
