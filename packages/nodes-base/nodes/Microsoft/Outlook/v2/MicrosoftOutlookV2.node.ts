import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { loadOptions, listSearch } from './methods';
import { description } from './actions/node.description';
import { router } from './actions/router';

export class MicrosoftOutlookV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...description,
		};
	}

	methods = { loadOptions, listSearch };

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
