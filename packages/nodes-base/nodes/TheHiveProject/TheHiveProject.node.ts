import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { versionDescription } from './actions/versionDescription';
import { router } from './actions/router';
import { loadOptions, listSearch } from './methods';

export class TheHiveProject implements INodeType {
	description: INodeTypeDescription = versionDescription;

	methods = { loadOptions, listSearch };

	async execute(this: IExecuteFunctions) {
		return router.call(this);
	}
}
