import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { CUSTOM_VIEW_FIELDS, VIEW_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	VIEW_LOCATOR,
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['view'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const viewId = this.getNodeParameter('viewId', i, '', { extractValue: true }) as string;
	const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

	const body = {
		query: `mutation CustomViewUpdate($viewId: String!, $name: String, $description: String) {
			customViewUpdate(id: $viewId, input: {
				name: $name
				description: $description
			}) {
				success
				customView {
					${CUSTOM_VIEW_FIELDS}
				}
			}
		}`,
		variables: { viewId, ...updateFields },
	};

	const responseData = await linearApiRequest.call(this, body);
	const customView = (responseData as { data: { customViewUpdate: { customView: IDataObject } } })
		.data.customViewUpdate?.customView;

	return customView;
}
