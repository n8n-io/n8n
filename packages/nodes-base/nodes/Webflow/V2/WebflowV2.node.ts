import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { getSites, getCollections, getFields } from '../GenericFunctions';
import { versionDescription } from './actions/versionDescription';
import { router } from './actions/router';

export class WebflowV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
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
