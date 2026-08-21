import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import {
	PROJECT_LOCATOR,
	PROJECT_UPDATE_FIELDS,
	PROJECT_UPDATE_HEALTH_OPTIONS,
} from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	PROJECT_LOCATOR,
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		required: true,
		default: '',
		typeOptions: { rows: 4 },
		description: 'The content of the update in markdown',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Health',
				name: 'health',
				type: 'options',
				options: PROJECT_UPDATE_HEALTH_OPTIONS,
				default: 'onTrack',
				description: 'The health of the project at the time of the update',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['projectUpdate'],
		operation: ['create'],
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
			const projectId = this.getNodeParameter('projectId', i, '', { extractValue: true }) as string;
			const updateBody = this.getNodeParameter('body', i) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

			const body = {
				query: `mutation ProjectUpdateCreate($projectId: String!, $body: String, $health: ProjectUpdateHealthType) {
					projectUpdateCreate(input: {
						projectId: $projectId
						body: $body
						health: $health
					}) {
						success
						projectUpdate {
							${PROJECT_UPDATE_FIELDS}
						}
					}
				}`,
				variables: { projectId, body: updateBody, ...additionalFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const projectUpdate = (
				responseData as { data: { projectUpdateCreate: { projectUpdate: IDataObject } } }
			).data.projectUpdateCreate?.projectUpdate;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(projectUpdate), {
					itemData: { item: i },
				}),
			);
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
