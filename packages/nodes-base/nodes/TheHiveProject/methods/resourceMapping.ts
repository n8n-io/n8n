import type { ILoadOptionsFunctions } from 'n8n-core';
import type {
	FieldType,
	IDataObject,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { theHiveApiRequest } from '../transport';
import { TLP } from '../helpers/interfaces';

export async function getCustomFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const body = {
		query: [
			{
				_name: 'listCustomField',
			},
		],
	};

	const requestResult = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	const columnData: ResourceMapperFields = {
		fields: ((requestResult as IDataObject[]) || []).map((field) => ({
			id: field._id as string,
			displayName: (field.displayName || field.name) as string,
			required: field.mandatory as boolean,
			display: true,
			// type: field.type as FieldType,
			type: (field.options as string[])?.length ? 'options' : (field.type as FieldType),
			defaultMatch: false,
			options: (field.options as string[])?.length
				? (field.options as string[]).map((option) => ({ name: option, value: option }))
				: undefined,
		})),
	};

	return columnData;
}

export async function getAlertFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const fields: ResourceMapperField[] = [
		{
			displayName: 'Title',
			id: 'title',
			required: true,
			display: true,
			type: 'string',
			defaultMatch: false,
		},
		{
			displayName: 'Description',
			id: 'description',
			required: true,
			display: true,
			type: 'string',
			defaultMatch: false,
		},
		{
			displayName: 'Type',
			id: 'type',
			required: true,
			display: true,
			type: 'string',
			defaultMatch: false,
		},
		{
			displayName: 'Source',
			id: 'source',
			required: true,
			display: true,
			type: 'string',
			defaultMatch: false,
		},
		{
			displayName: 'Source Reference',
			id: 'sourceRef',
			required: true,
			display: true,
			type: 'string',
			defaultMatch: false,
		},
		{
			displayName: 'External Link',
			id: 'externalLink',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Severity',
			id: 'severity',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			removed: true,
			options: [
				{
					name: 'Low',
					value: 1,
				},
				{
					name: 'Medium',
					value: 2,
				},
				{
					name: 'High',
					value: 3,
				},
				{
					name: 'Critical',
					value: 4,
				},
			],
		},
		{
			displayName: 'Date',
			id: 'date',
			required: false,
			display: true,
			type: 'dateTime',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Tags',
			id: 'tags',
			required: false,
			display: true,
			type: 'array',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Flag',
			id: 'flag',
			required: false,
			display: true,
			type: 'boolean',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'TLP',
			id: 'tlp',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			removed: true,
			options: [
				{
					name: 'White',
					value: TLP.white,
				},
				{
					name: 'Green',
					value: TLP.green,
				},
				{
					name: 'Amber',
					value: TLP.amber,
				},
				{
					name: 'Red',
					value: TLP.red,
				},
			],
		},
		{
			displayName: 'PAP',
			id: 'pap',
			required: false,
			display: true,
			type: 'number',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Summary',
			id: 'summary',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Status',
			id: 'status',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Case Template',
			id: 'caseTemplate',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			removed: true,
		},
	];

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}
