import type { INodeType, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { keboolaNodeDescription } from './description';
import { keboolaNodeExecution } from './execution';

export class KeboolaV1 implements INodeType {
	description: INodeTypeBaseDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			// Optionally change subtitle to be upload-specific
			subtitle: '={{"upload: table"}}',
			defaults: {
				name: 'Keboola',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'keboolaApiToken',
					required: true,
					displayOptions: {
						show: {
							authentication: ['keboolaApiToken'],
						},
					},
				},
			],
			properties: keboolaNodeDescription,
		};
	}

	async execute(...args: Parameters<typeof keboolaNodeExecution>) {
		return await keboolaNodeExecution.apply(this, args);
	}
}
