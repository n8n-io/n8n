import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { credentialTest, listSearch, loadOptions, resourceMapping } from './methods';

export class GoogleSheetsV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions,
		credentialTest,
		listSearch,
		resourceMapping,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
