/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { IExecuteFunctions } from 'n8n-core';

import { listSearch, credentialTest, loadOptions } from './methods';

import { versionDescription } from './actions/versionDescription';

import { router } from './actions/router';

export class MySqlV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = { listSearch, loadOptions, credentialTest };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return router.call(this);
	}
}
