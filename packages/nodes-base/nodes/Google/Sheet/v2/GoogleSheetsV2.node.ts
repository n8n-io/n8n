import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { router } from './actions/router';
import { singleResourceExpressionHints, versionDescription } from './actions/versionDescription';
import { credentialTest, listSearch, loadOptions, resourceMapping } from './methods';

export class GoogleSheetsV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription, nodeVersion?: number) {
		this.description = {
			...baseDescription,
			...versionDescription,
			...(nodeVersion === undefined
				? {}
				: {
						version: nodeVersion,
						hints: versionDescription.hints?.filter(
							(hint) => !singleResourceExpressionHints.includes(hint),
						),
					}),
		};
	}

	methods = {
		loadOptions,
		credentialTest,
		listSearch,
		resourceMapping,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
