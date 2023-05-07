/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { IExecuteFunctions } from 'n8n-core';

import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';

import { listSearch, loadOptions } from './methods';
import { versionDescription } from './actions/versionDescription';
import { router } from './actions/router';

export class MicrosoftExcelV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = { listSearch, loadOptions };

	async execute(this: IExecuteFunctions) {
		return router.call(this);
	}
}
