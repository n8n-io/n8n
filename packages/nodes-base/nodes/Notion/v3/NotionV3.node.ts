import type {
	IExecuteFunctions,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	INodeType,
} from 'n8n-workflow';

import { router } from './actions/router';
import { listSearch, loadOptions } from './methods';
import { versionDescription } from './VersionDescription';

export class NotionV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = { listSearch, loadOptions };

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
