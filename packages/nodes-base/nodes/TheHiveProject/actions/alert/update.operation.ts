import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { theHiveApiRequest } from '../../transport';
import { splitTags } from '../../helpers/utils';
import set from 'lodash/set';

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

	const fieldsToMatchOn = this.getNodeParameter('fields.matchingColumns', i) as string[];

	const updateBody: IDataObject = {};
	const updateFields: IDataObject = {};
	const { id } = body; // id would be used if matching on id, also we need to remove it from the body

	for (const field of Object.keys(body)) {
		if (field === 'customFields') {
			//in input data customFields sent as an object, parse it extracting customFields that are used for matching
			const customFields: IDataObject = {};
			for (const customField of Object.keys(body.customFields || {})) {
				const customFieldPath = `customFields.${customField}`;
				if (fieldsToMatchOn.includes(customFieldPath)) {
					updateFields[customFieldPath] = (body.customFields as IDataObject)[customField];
				} else {
					customFields[customField] = (body.customFields as IDataObject)[customField];
				}
			}
			set(updateBody, 'customFields', customFields);
			continue;
		}
		if (fieldsToMatchOn.includes(field)) {
			// if field is in fieldsToMatchOn, we need to exclude it from the updateBody, as values used for matching should not be updated
			updateFields[field] = body[field];
		} else {
			// use set to construct the updateBody, as it allows to process customFields.fieldName
			// if customFields provided under customFields property, it will be send as is
			set(updateBody, field, body[field]);
		}
	}

	if (fieldsToMatchOn.includes('id')) {
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

		updateBody.ids = ids;

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
