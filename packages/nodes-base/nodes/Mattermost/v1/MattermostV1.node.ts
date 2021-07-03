import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { description } from './description';
import { methods } from './methods';
import { router } from './actions/router';
export class MattermostV1 implements INodeType {
	
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...description,
		};
	}

	methods = methods;

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
