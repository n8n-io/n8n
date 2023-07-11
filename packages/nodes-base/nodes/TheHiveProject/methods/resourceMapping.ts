import type { ILoadOptionsFunctions } from 'n8n-core';
import type {
	FieldType,
	IDataObject,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { theHiveApiRequest } from '../transport';

import { loadAlertStatus, loadCaseStatus, loadCaseTemplate, loadUsers } from './loadOptions';
import { alertCommonFields, caseCommonFields, taskCommonFields } from '../helpers/constants';

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

	const requiredFields = ['title', 'description', 'type', 'source', 'sourceRef'];
	const excludeFields = ['addTags', 'removeTags', 'lastSyncDate'];

	const fields: ResourceMapperField[] = alertCommonFields
		.filter((entry) => !excludeFields.includes(entry.id))
		.map((entry) => {
			const type = entry.type as FieldType;
			const field: ResourceMapperField = {
				...entry,
				type,
				required: false,
				display: true,
				defaultMatch: false,
				removed: true,
			};

			if (requiredFields.includes(entry.id)) {
				field.required = true;
				field.removed = false;
			}

			if (field.id === 'status') {
				field.options = alertStatus;
			}

			if (field.id === 'caseTemplate') {
				field.options = caseTemplates;
			}
			return field;
		});

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
	const excludedFromMatching = ['addTags', 'removeTags'];
	const excludeFields = ['flag', 'caseTemplate'];

	const alertUpdateFields = alertCommonFields
		.filter((entry) => !excludeFields.includes(entry.id))
		.map((entry) => {
			const type = entry.type as FieldType;
			const field: ResourceMapperField = {
				...entry,
				type,
				required: false,
				display: true,
				defaultMatch: false,
				canBeUsedToMatch: true,
			};

			if (excludedFromMatching.includes(field.id)) {
				field.canBeUsedToMatch = false;
			}

			if (field.id === 'status') {
				field.options = alertStatus;
			}
			return field;
		});

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
		...alertUpdateFields,
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

	const requiredFields = ['title', 'description'];
	const excludeFields = ['impactStatus', 'taskRule', 'addTags', 'removeTags'];

	const fields: ResourceMapperField[] = alertCommonFields
		.filter((entry) => !excludeFields.includes(entry.id))
		.map((entry) => {
			const type = entry.type as FieldType;
			const field: ResourceMapperField = {
				...entry,
				type,
				required: false,
				display: true,
				defaultMatch: false,
				removed: true,
			};

			if (requiredFields.includes(entry.id)) {
				field.required = true;
				field.removed = false;
			}

			if (field.id === 'assignee') {
				field.options = users;
			}

			if (field.id === 'status') {
				field.options = caseStatus;
			}

			if (field.id === 'caseTemplate') {
				field.options = caseTemplates;
			}
			return field;
		});

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

	const excludedFromMatching = ['addTags', 'removeTags', 'taskRule', 'observableRule'];
	const excludeFields = ['caseTemplate', 'tasks', 'sharingParameters'];

	const caseUpdateFields = caseCommonFields
		.filter((entry) => !excludeFields.includes(entry.id))
		.map((entry) => {
			const type = entry.type as FieldType;
			const field: ResourceMapperField = {
				...entry,
				type,
				required: false,
				display: true,
				defaultMatch: false,
				canBeUsedToMatch: true,
			};

			if (excludedFromMatching.includes(field.id)) {
				field.canBeUsedToMatch = false;
			}

			if (field.id === 'assignee') {
				field.options = users;
			}

			if (field.id === 'status') {
				field.options = caseStatus;
			}
			return field;
		});

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
		...caseUpdateFields,
	];

	const customFields = (await getCustomFields.call(this)) || [];
	fields.push(...customFields);

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}

export async function getTaskFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const users = await loadUsers.call(this);

	const requiredFields = ['title'];

	const fields: ResourceMapperField[] = taskCommonFields.map((entry) => {
		const type = entry.type as FieldType;
		const field: ResourceMapperField = {
			...entry,
			type,
			required: false,
			display: true,
			defaultMatch: false,
			removed: true,
		};

		if (requiredFields.includes(entry.id)) {
			field.required = true;
			field.removed = false;
		}

		if (field.id === 'assignee') {
			field.options = users;
		}

		return field;
	});

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}

export async function getTaskUpdateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const users = await loadUsers.call(this);

	const caseUpdateFields = taskCommonFields.map((entry) => {
		const type = entry.type as FieldType;
		const field: ResourceMapperField = {
			...entry,
			type,
			required: false,
			display: true,
			defaultMatch: false,
			canBeUsedToMatch: true,
		};

		if (field.id === 'assignee') {
			field.options = users;
		}

		return field;
	});

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
		...caseUpdateFields,
	];

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}
