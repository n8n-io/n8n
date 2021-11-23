import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { versionDescription } from './actions/versionDescription';
import { router } from './actions/router';

export class SyncroMspV1 implements INodeType {

	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions) {
		// Router returns INodeExecutionData[]
		// We need to output INodeExecutionData[][]
		// So we wrap in []
		return [await router.call(this)];
	}
}
