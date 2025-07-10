import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { getSites, getCollections, getFields } from '../GenericFunctions';
import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';

export class WebflowV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
			usableAsTool: true,
		};
	}

	methods = {
		loadOptions: {
			getSites,
			getCollections,
			getFields,
		},
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
