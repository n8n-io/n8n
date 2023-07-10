import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { theHiveApiRequest } from '../transport';

export async function loadResponders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	let resource = this.getNodeParameter('resource') as string;

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

	let resourceId = '';

	if (['case', 'alert'].includes(resource)) {
		resourceId = this.getNodeParameter('id', '', { extractValue: true }) as string;
	} else {
		resourceId = this.getNodeParameter('id') as string;
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

export async function listCustomField(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const body = {
		query: [
			{
				_name: 'listCustomField',
			},
		],
	};

	const requestResult = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	const returnData: INodePropertyOptions[] = [];

	for (const field of requestResult) {
		returnData.push({
			name: field.displayName || field.name,
			value: field.name,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-line-break-html-tag
			description: `${field.description};<br> Type: ${field.type}; Required: ${field.mandatory}`,
		} as INodePropertyOptions);
	}

	return returnData;
}

export async function loadObservableTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const dataTypes = await theHiveApiRequest.call(this, 'GET', '/observable/type?range=all');

	const returnData: INodePropertyOptions[] = dataTypes.map((dataType: IDataObject) => {
		return {
			name: dataType.name as string,
			value: dataType.name as string,
		};
	});

	// Sort the array by option name
	returnData.sort((a, b) => {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});

	return returnData;
}

export async function getCaseAttachments(
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

	const alertFields: INodePropertyOptions[] = [
		// {
		// 	name: 'ID',
		// 	value: 'id',
		// },
		{
			name: 'Title',
			value: 'title',
		},
		{
			name: 'Description',
			value: 'description',
		},
		{
			name: 'Type',
			value: 'type',
		},
		{
			name: 'Source',
			value: 'source',
		},
		{
			name: 'Source Reference',
			value: 'sourceRef',
		},
		{
			name: 'External Link',
			value: 'externalLink',
		},
		{
			name: 'Severity (Severity of Information)',
			value: 'severity',
		},
		{
			name: 'Date',
			value: 'date',
		},
		{
			name: 'Last Sync Date',
			value: 'lastSyncDate',
		},
		{
			name: 'Tags',
			value: 'tags',
		},
		{
			name: 'Follow',
			value: 'follow',
		},
		{
			name: 'TLP (Confidentiality of Information)',
			value: 'tlp',
		},
		{
			name: 'PAP (Level of Exposure of Information)',
			value: 'pap',
		},
		{
			name: 'Summary',
			value: 'summary',
		},
		{
			name: 'Status',
			value: 'status',
		},
		{
			name: 'Add Tags',
			value: 'addTags',
		},
		{
			name: 'Remove Tags',
			value: 'removeTags',
		},
	];

	const customFields = await loadCustomFields.call(this);

	returnData.push(...alertFields, ...customFields);
	return returnData;
}
