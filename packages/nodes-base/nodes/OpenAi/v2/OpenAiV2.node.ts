/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch } from './methods';

export class OpenAiV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		listSearch,
	};

	async execute(this: IExecuteFunctions) {
		return router.call(this);
	}
}
