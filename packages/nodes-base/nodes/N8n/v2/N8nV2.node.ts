import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { N8N_CLIENT_HEADER, N8N_CLIENT_N8N_NODE } from '../shared/constants';
import { searchWorkflows } from '../shared/WorkflowLocator';
import { properties } from './generated/properties.generated';

export class N8nV2 implements INodeType {
	description: INodeTypeDescription;

	methods = { listSearch: { searchWorkflows } };

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
				baseURL:
					'={{ $credentials.baseUrl.replace(new RegExp("([^:])/{2,}", "g"), "$1/").replace(new RegExp("/+$"), "") }}',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					[N8N_CLIENT_HEADER]: N8N_CLIENT_N8N_NODE,
				},
			},
			properties,
		};
	}
}
