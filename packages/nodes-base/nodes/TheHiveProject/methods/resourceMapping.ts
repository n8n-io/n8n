import type { ILoadOptionsFunctions } from 'n8n-core';
import type {
	FieldType,
	IDataObject,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { theHiveApiRequest } from '../transport';
import { TLP } from '../helpers/interfaces';
import { loadAlertStatus, loadCaseTemplate } from './loadOptions';

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
	const alertStatus = await loadAlertStatus.call(this);
	const caseTemplates = await loadCaseTemplate.call(this);
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
			displayName: 'Severity (Severity of information)',
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
			displayName: 'Date (timestam in ms)',
			id: 'date',
			required: false,
			display: true,
			type: 'number',
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
			displayName: 'TLP (Confidentiality of information)',
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
			displayName: 'PAP (Level of exposure of information)',
			id: 'pap',
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
			type: 'options',
			defaultMatch: false,
			removed: true,
			options: alertStatus,
		},
		{
			displayName: 'Case Template',
			id: 'caseTemplate',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			removed: true,
			options: caseTemplates,
		},
	];

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}

export async function getAlertUpdateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const alertStatus = await loadAlertStatus.call(this);
	const fields: ResourceMapperField[] = [
		{
			displayName: 'ID',
			id: 'id',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: true,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Title',
			id: 'title',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Description',
			id: 'description',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
		},
		{
			displayName: 'Type',
			id: 'type',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Source',
			id: 'source',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Source Reference',
			id: 'sourceRef',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'External Link',
			id: 'externalLink',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Severity (Severity of information)',
			id: 'severity',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			canBeUsedToMatch: true,
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
			displayName: 'Date (timestam in ms)',
			id: 'date',
			required: false,
			display: true,
			type: 'number',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Last Sync Date (timestam in ms)',
			id: 'lastSyncDate',
			required: false,
			display: true,
			type: 'number',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Tags',
			id: 'tags',
			required: false,
			display: true,
			type: 'array',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Follow',
			id: 'follow',
			required: false,
			display: true,
			type: 'boolean',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'TLP (Confidentiality of information)',
			id: 'tlp',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			canBeUsedToMatch: true,
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
			displayName: 'PAP (Level of exposure of information)',
			id: 'pap',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			canBeUsedToMatch: true,
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
			displayName: 'Summary',
			id: 'summary',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Status',
			id: 'status',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			canBeUsedToMatch: true,
			options: alertStatus,
		},
		{
			displayName: 'Add Tags',
			id: 'addTags',
			required: false,
			display: true,
			type: 'array',
			defaultMatch: false,
			canBeUsedToMatch: false,
		},
		{
			displayName: 'Remove Tags',
			id: 'removeTags',
			required: false,
			display: true,
			type: 'array',
			defaultMatch: false,
			canBeUsedToMatch: false,
		},
	];

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}
