import type { IExecuteFunctions, INodeType, INodeTypeBaseDescription } from 'n8n-workflow';

import { description } from './actions/node.description';
import { router } from './actions/router';
import { loadOptions } from './methods';

export class OdooV2 implements INodeType {
	description = description;

	methods = { loadOptions };

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...this.description,
			...baseDescription,
		};
	}

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
