import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { MergeClient } from '@mergeapi/merge-node-client';

export class MergeDev implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Merge.dev',
		name: 'mergeDev',
		icon: 'file:merge-dev.svg',
		group: ['output'],
		version: 1,
		description: 'Interact with a Merge.dev linked account',
		defaults: { name: 'Merge.dev' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'mergeDevApi',
				required: true,
			},
		],
		properties: [
			// first get linked account details https://api.merge.dev/api/ats/v1/account-details
			// then use https://api.merge.dev/api/filestorage/v1/linked-accounts
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Common Models',
				name: 'commonModels',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCommonModels',
				},
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Model Operation',
				name: 'modelOperation',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['commonModels'],
					loadOptionsMethod: 'getModelOperations',
				},
				default: '',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['commonModels', 'modelOperation'],
					resourceMapper: {
						resourceMapperMethod: 'getModelFields',
						mode: 'map',
						addAllFields: true,
						fieldWords: {
							singular: 'field',
							plural: 'fields',
						},
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		//test files list
		const responseData: IDataObject[] = [];
		const { apiKey, accountToken } = (await this.getCredentials('mergeDevApi')) as {
			apiKey: string;
			accountToken: string;
		};
		const merge = new MergeClient({ apiKey, accountToken });
		const data = await merge.filestorage.files.list();
		responseData.push(...((data.results as IDataObject[]) ?? []));

		return [this.helpers.returnJsonArray(responseData)];
	}
}
