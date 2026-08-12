import type {
	FieldType,
	IDataObject,
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import {
	loadAlertStatus,
	loadCaseStatus,
	loadCaseTemplate,
	loadObservableTypes,
	loadUsers,
} from './loadOptions';
import {
	alertCommonFields,
	caseCommonFields,
	observableCommonFields,
	taskCommonFields,
} from '../helpers/constants';
import { theHiveApiRequest } from '../transport';

async function getCustomFields(this: ILoadOptionsFunctions) {
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
		removed: true,
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
			};

			if (requiredFields.includes(entry.id)) {
				field.required = true;
			}

			if (field.id === 'status') {
				field.options = alertStatus;
			}

			if (field.id === 'caseTemplate') {
				field.options = caseTemplates;
			}
			return field;
		});

	const customFields = (await getCustomFields.call(this)) || [];
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
	const excludeCreateFields = ['impactStatus', 'taskRule', 'addTags', 'removeTags'];

	const fields: ResourceMapperField[] = caseCommonFields
		.filter((entry) => !excludeCreateFields.includes(entry.id))
		.map((entry) => {
			const type = entry.type as FieldType;
			const field: ResourceMapperField = {
				...entry,
				type,
				required: false,
				display: true,
				defaultMatch: false,
			};

			if (requiredFields.includes(entry.id)) {
				field.required = true;
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

	const customFields = (await getCustomFields.call(this)) || [];
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
	const excludeUpdateFields = ['caseTemplate', 'tasks', 'sharingParameters'];

	const caseUpdateFields = caseCommonFields
		.filter((entry) => !excludeUpdateFields.includes(entry.id))
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
		};

		if (requiredFields.includes(entry.id)) {
			field.required = true;
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

export async function getLogFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const fields: ResourceMapperField[] = [
		{
			displayName: 'Message',
			id: 'message',
			required: true,
			display: true,
			type: 'string',
			defaultMatch: true,
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
			displayName: 'Include In Timeline',
			id: 'includeInTimeline',
			required: false,
			display: true,
			type: 'dateTime',
			defaultMatch: false,
			removed: true,
		},
	];

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}

export async function getObservableFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const excludeFields = ['addTags', 'removeTags', 'dataType'];

	const fields: ResourceMapperField[] = observableCommonFields
		.filter((entry) => !excludeFields.includes(entry.id))
		.map((entry) => {
			const type = entry.type as FieldType;
			const field: ResourceMapperField = {
				...entry,
				type,
				required: false,
				display: true,
				defaultMatch: false,
			};

			return field;
		});

	const columnData: ResourceMapperFields = {
		fields,
	};

	return columnData;
}

export async function getObservableUpdateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const dataTypes = await loadObservableTypes.call(this);

	const excludedFromMatching = ['addTags', 'removeTags'];
	const excludeFields: string[] = ['attachment', 'data', 'startDate', 'zipPassword', 'isZip'];

	const caseUpdateFields = observableCommonFields
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

			if (field.id === 'dataType') {
				field.options = dataTypes;
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
