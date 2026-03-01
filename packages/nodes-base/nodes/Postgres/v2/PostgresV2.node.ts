import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { credentialTest, listSearch, loadOptions, resourceMapping } from './methods';

export class PostgresV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = { credentialTest, listSearch, loadOptions, resourceMapping };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
