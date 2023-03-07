import type { IExecuteFunctions } from 'n8n-core';
import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';
import { versionDescription } from './actions/versionDescription';
import { credentialTest, listSearch, loadOptions } from './methods';
import { router } from './actions/router';

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
	};

	async execute(this: IExecuteFunctions) {
		return router.call(this);
	}
}
