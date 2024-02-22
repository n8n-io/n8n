import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { versionDescription } from './actions/versionDescription';
import { listSearch } from './methods';
import { router } from './actions/router';

export class GoogleDriveV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = { listSearch };

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
