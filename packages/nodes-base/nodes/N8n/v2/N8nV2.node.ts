import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { generatedProperties } from './generated/description.generated';
import overrides from './overrides';
import { collectMethods } from './define-overrides';

export class N8nV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {
				name: 'n8n',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'n8nApi',
					required: true,
				},
			],
			requestDefaults: {
				baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			},
			properties: generatedProperties,
		};
	}

	methods = collectMethods(overrides);
}
