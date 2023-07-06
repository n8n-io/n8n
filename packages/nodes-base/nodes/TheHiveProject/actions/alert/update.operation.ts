import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { customFieldsCollection2 } from '../common.description';
import { theHiveApiRequest } from '../../transport';
import { convertCustomFieldUiToObject, splitTags } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		noDataExpression: true,
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getAlertUpdateFields',
				mode: 'update',
				valuesLabel: 'Fields',
				addAllFields: true,
				multiKeyMatch: true,
			},
		},
	},
	customFieldsCollection2,
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	item: INodeExecutionData,
): Promise<INodeExecutionData[]> {
	let body: IDataObject = {};
	let updatedAlerts = 1;

	const dataMode = this.getNodeParameter('fields.mappingMode', i) as string;

	if (dataMode === 'autoMapInputData') {
		body = item.json;
	}

	if (dataMode === 'defineBelow') {
		const fields = this.getNodeParameter('fields.value', i, []) as IDataObject;
		body = fields;
	}

	if (body.tags) {
		body.tags = splitTags(body.tags);
	}
	if (body.addTags) {
		body.addTags = splitTags(body.addTags);
	}
	if (body.removeTags) {
		body.removeTags = splitTags(body.removeTags);
	}

	const customFieldsUi = this.getNodeParameter('customFieldsUi.values', i, {}) as IDataObject;
	body.customFields = convertCustomFieldUiToObject(customFieldsUi);

	const fieldsToMatchOn = this.getNodeParameter('fields.matchingColumns', i) as string[];

	if (fieldsToMatchOn.includes('id')) {
		const { id } = body;
		await theHiveApiRequest.call(this, 'PATCH', `/v1/alert/${id}`, body);
	} else {
		const filter = {
			_name: 'filter',
			_and: fieldsToMatchOn.map((field) => ({
				_eq: {
					_field: field,
					_value: body[field],
				},
			})),
		};

		const queryBody = {
			query: [
				{
					_name: 'listAlert',
				},
				filter,
			],
		};

		const matches = (await theHiveApiRequest.call(
			this,
			'POST',
			'/v1/query',
			queryBody,
		)) as IDataObject[];

		if (!matches.length) {
			throw new NodeOperationError(this.getNode(), 'No matching alerts found');
		}
		const ids = matches.map((match) => match._id);
		updatedAlerts = ids.length;

		const updateBody: IDataObject = { ids };

		for (const field of Object.keys(body)) {
			if (fieldsToMatchOn.includes(field)) continue;
			updateBody[field] = body[field];
		}

		await theHiveApiRequest.call(this, 'PATCH', '/v1/alert/_bulk', updateBody);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		wrapData({ success: true, updatedAlerts }),
		{
			itemData: { item: i },
		},
	);

	return executionData;
}
