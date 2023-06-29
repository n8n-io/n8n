import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { theHiveApiRequest } from '../transport';
import { mapResource } from '../helpers/utils';

export async function loadResponders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// request the analyzers from instance
	const resource = this.getNodeParameter('resource') as string;
	const theHiveResource = mapResource(resource);

	let resourceId = '';
	if (['case', 'alert'].includes(resource)) {
		resourceId = this.getNodeParameter('id', '', { extractValue: true }) as string;
	} else {
		resourceId = this.getNodeParameter('id') as string;
	}

	const responders = await theHiveApiRequest.call(
		this,
		'GET',
		`/connector/cortex/responder/${theHiveResource}/${resourceId}`,
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
	// request the analyzers from instance
	const dataType = this.getNodeParameter('dataType') as string;
	const endpoint = `/connector/cortex/analyzer/type/${dataType}`;
	const requestResult = await theHiveApiRequest.call(this, 'GET', endpoint);
	const returnData: INodePropertyOptions[] = [];

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
			name: `${field.name}: ${field.reference}`,
			value: field.reference,
			description: `${field.type}: ${field.description}`,
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
