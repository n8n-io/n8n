import type { ILoadOptionsFunctions } from 'n8n-core';
import type {
	FieldType,
	IDataObject,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { theHiveApiRequest } from '../transport';
import { TLP } from '../helpers/interfaces';
import { loadAlertStatus, loadCaseStatus, loadCaseTemplate, loadUsers } from './loadOptions';

async function getCustomFields(this: ILoadOptionsFunctions, isRemoved?: boolean) {
	const customFields = (await theHiveApiRequest.call(this, 'POST', '/v1/query', {
		query: [
			{
				_name: 'listCustomField',
			},
		],
	})) as IDataObject[];

	return customFields.map((field) => ({
		displayName: `Custom Field: ${(field.displayName || field.name) as string}`,
		id: `customFields.${field.name}`,
		required: false,
		display: true,
		type: (field.options as string[])?.length ? 'options' : (field.type as FieldType),
		defaultMatch: false,
		options: (field.options as string[])?.length
			? (field.options as string[]).map((option) => ({ name: option, value: option }))
			: undefined,
		removed: isRemoved,
	}));
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
			type: 'string',
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

	const customFields = (await getCustomFields.call(this, true)) || [];
	fields.push(...customFields);

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
			displayName: 'Date',
			id: 'date',
			required: false,
			display: true,
			type: 'dateTime',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Last Sync Date',
			id: 'lastSyncDate',
			required: false,
			display: true,
			type: 'dateTime',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Tags',
			id: 'tags',
			required: false,
			display: true,
			type: 'string',
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
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: false,
		},
		{
			displayName: 'Remove Tags',
			id: 'removeTags',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: false,
		},
	];

	const customFields = (await getCustomFields.call(this)) || [];
	fields.push(...customFields);

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}

export async function getCaseFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const caseStatus = await loadCaseStatus.call(this);
	const caseTemplates = await loadCaseTemplate.call(this);
	const users = await loadUsers.call(this);
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
			displayName: 'Start Date',
			id: 'startDate',
			required: false,
			display: true,
			type: 'dateTime',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'End Date',
			id: 'endDate',
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
			type: 'string',
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
			displayName: 'Status',
			id: 'status',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			removed: true,
			options: caseStatus,
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
			displayName: 'Assignee',
			id: 'assignee',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			removed: true,
			options: users,
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
		{
			displayName: 'Tasks',
			id: 'tasks',
			required: false,
			display: true,
			type: 'array',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Sharing Parameters',
			id: 'sharingParameters',
			required: false,
			display: true,
			type: 'array',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Task Rule',
			id: 'taskRule',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Observable Rule',
			id: 'observableRule',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			removed: true,
		},
	];

	const customFields = (await getCustomFields.call(this, true)) || [];
	fields.push(...customFields);

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}

export async function getCaseUpdateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const caseStatus = await loadCaseStatus.call(this);
	const users = await loadUsers.call(this);
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
			displayName: 'Start Date',
			id: 'startDate',
			required: false,
			display: true,
			type: 'dateTime',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'End Date',
			id: 'endDate',
			required: false,
			display: true,
			type: 'dateTime',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Tags',
			id: 'tags',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: true,
		},
		{
			displayName: 'Flag',
			id: 'flag',
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
			displayName: 'Status',
			id: 'status',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			canBeUsedToMatch: true,
			options: caseStatus,
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
			displayName: 'Assignee',
			id: 'assignee',
			required: false,
			display: true,
			type: 'options',
			defaultMatch: false,
			canBeUsedToMatch: true,
			options: users,
		},
		{
			displayName: 'Impact Status',
			id: 'impactStatus',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: true,
			removed: true,
		},
		{
			displayName: 'Task Rule',
			id: 'taskRule',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Observable Rule',
			id: 'observableRule',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			removed: true,
		},
		{
			displayName: 'Add Tags',
			id: 'addTags',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: false,
		},
		{
			displayName: 'Remove Tags',
			id: 'removeTags',
			required: false,
			display: true,
			type: 'string',
			defaultMatch: false,
			canBeUsedToMatch: false,
		},
	];

	const customFields = (await getCustomFields.call(this)) || [];
	fields.push(...customFields);

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}
