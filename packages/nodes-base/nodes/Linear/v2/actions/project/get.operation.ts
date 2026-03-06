import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['project'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const projectId = this.getNodeParameter('projectId', i) as string;

			const body = {
				query: `query Project($projectId: String!) {
					project(id: $projectId) {
						id
						name
						description
						state
						createdAt
						updatedAt
						targetDate
						url
						lead {
							id
							displayName
							email
						}
					}
				}`,
				variables: { projectId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const project = (responseData as { data: { project: IDataObject } }).data.project;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(project as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					),
				);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
