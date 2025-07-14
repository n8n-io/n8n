import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import {
	alertCommonFields,
	caseCommonFields,
	observableCommonFields,
	taskCommonFields,
} from '../helpers/constants';
import { theHiveApiRequest } from '../transport';

export async function loadResponders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	let resource = this.getNodeParameter('resource') as string;

	let resourceId = '';

	if (['case', 'alert', 'observable', 'log', 'task'].includes(resource)) {
		resourceId = this.getNodeParameter('id', '', { extractValue: true }) as string;
	} else {
		resourceId = this.getNodeParameter('id') as string;
	}

	switch (resource) {
		case 'observable':
			resource = 'case_artifact';
			break;
		case 'task':
			resource = 'case_task';
			break;
		case 'log':
			resource = 'case_task_log';
			break;
	}

	const responders = await theHiveApiRequest.call(
		this,
		'GET',
		`/connector/cortex/responder/${resource}/${resourceId}`,
	);

	const returnData: INodePropertyOptions[] = [];

	for (const responder of responders) {
		returnData.push({
			name: responder.name as string,
			value: responder.id,
			description: responder.description as string,
		});
	}

	return returnData;
}

export async function loadAnalyzers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const dataType = this.getNodeParameter('dataType') as string;

	const requestResult = await theHiveApiRequest.call(
		this,
		'GET',
		`/connector/cortex/analyzer/type/${dataType}`,
	);

	for (const analyzer of requestResult) {
		for (const cortexId of analyzer.cortexIds) {
			returnData.push({
				name: `[${cortexId}] ${analyzer.name}`,
				value: `${analyzer.id as string}::${cortexId as string}`,
				description: analyzer.description as string,
			});
		}
	}

	return returnData;
}

export async function loadCustomFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const requestResult = await theHiveApiRequest.call(this, 'GET', '/customField');

	const returnData: INodePropertyOptions[] = [];

	for (const field of requestResult) {
		returnData.push({
			name: `Custom Field: ${(field.displayName || field.name) as string}`,
			value: `customFields.${field.name}`,
			// description: `${field.type}: ${field.description}`,
		} as INodePropertyOptions);
	}

	return returnData;
}

export async function loadObservableTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const body = {
		query: [
			{
				_name: 'listObservableType',
			},
		],
	};

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	for (const entry of response) {
		returnData.push({
			name: `${entry.name as string}${entry.isAttachment ? ' (attachment)' : ''}`,
			value: entry.name,
		});
	}
	return returnData;
}
export async function loadCaseAttachments(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const caseId = this.getNodeParameter('caseId', '', { extractValue: true }) as string;

	const body = {
		query: [
			{
				_name: 'getCase',
				idOrName: caseId,
			},
			{
				_name: 'attachments',
			},
		],
	};

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	for (const entry of response) {
		returnData.push({
			name: entry.name as string,
			value: entry._id,
			description: `Content-Type: ${entry.contentType}`,
		});
	}
	return returnData;
}

export async function loadLogAttachments(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const logId = this.getNodeParameter('logId', '', { extractValue: true }) as string;

	const body = {
		query: [
			{
				_name: 'getLog',
				idOrName: logId,
			},
		],
	};

	// extract log object from array
	const [response] = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	for (const entry of (response.attachments as IDataObject[]) || []) {
		returnData.push({
			name: entry.name as string,
			value: entry._id as string,
			description: `Content-Type: ${entry.contentType}`,
		});
	}
	return returnData;
}

export async function loadAlertStatus(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const body = {
		query: [
			{
				_name: 'listAlertStatus',
			},
		],
	};

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	for (const entry of response) {
		returnData.push({
			name: entry.value,
			value: entry.value,
			description: `Stage: ${entry.stage}`,
		});
	}
	return returnData.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadCaseStatus(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const body = {
		query: [
			{
				_name: 'listCaseStatus',
			},
		],
	};

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	for (const entry of response) {
		returnData.push({
			name: entry.value,
			value: entry.value,
			description: `Stage: ${entry.stage}`,
		});
	}
	return returnData.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadCaseTemplate(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const body = {
		query: [
			{
				_name: 'listCaseTemplate',
			},
		],
	};

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	for (const entry of response) {
		returnData.push({
			name: entry.displayName || entry.name,
			value: entry.name,
		});
	}
	return returnData;
}

export async function loadUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const body = {
		query: [
			{
				_name: 'listUser',
			},
		],
	};

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	for (const entry of response) {
		returnData.push({
			name: entry.name,
			value: entry.login,
		});
	}
	return returnData;
}

export async function loadAlertFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const excludeFields = ['addTags', 'removeTags'];

	const fields = alertCommonFields
		.filter((entry) => !excludeFields.includes(entry.id))
		.map((entry) => {
			const field: INodePropertyOptions = {
				name: entry.displayName || entry.id,
				value: entry.id,
			};

			return field;
		});

	const customFields = await loadCustomFields.call(this);

	returnData.push(...fields, ...customFields);
	return returnData;
}

export async function loadCaseFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const excludeFields = ['addTags', 'removeTags', 'taskRule', 'observableRule'];

	const fields = caseCommonFields
		.filter((entry) => !excludeFields.includes(entry.id))
		.map((entry) => {
			const field: INodePropertyOptions = {
				name: entry.displayName || entry.id,
				value: entry.id,
			};

			return field;
		});

	const customFields = await loadCustomFields.call(this);

	returnData.push(...fields, ...customFields);
	return returnData;
}

export async function loadObservableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const excludeFields = ['addTags', 'removeTags', 'zipPassword'];

	const fields = observableCommonFields
		.filter((entry) => !excludeFields.includes(entry.id))
		.map((entry) => {
			const field: INodePropertyOptions = {
				name: entry.displayName || entry.id,
				value: entry.id,
			};

			return field;
		});

	returnData.push(...fields);
	return returnData;
}

export async function loadTaskFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const fields = taskCommonFields.map((entry) => {
		const field: INodePropertyOptions = {
			name: entry.displayName || entry.id,
			value: entry.id,
		};

		return field;
	});

	return fields;
}
