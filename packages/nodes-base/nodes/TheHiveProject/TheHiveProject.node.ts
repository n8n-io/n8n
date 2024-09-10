import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { description } from './actions/node.description';
import { router } from './actions/router';
import { loadOptions, listSearch, resourceMapping } from './methods';

export class TheHiveProject implements INodeType {
	description: INodeTypeDescription = description;

	methods = { loadOptions, listSearch, resourceMapping };

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
