import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { theHiveApiRequest } from '../transport';

import { mapResource } from '../helpers/utils';

export async function loadResponders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// request the analyzers from instance
	const resource = mapResource(this.getNodeParameter('resource') as string);
	const resourceId = this.getNodeParameter('id');
	const endpoint = `/connector/cortex/responder/${resource}/${resourceId}`;

	const responders = await theHiveApiRequest.call(this, 'GET', endpoint);

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
	const credentials = await this.getCredentials('theHiveApi');
	const version = credentials.apiVersion;
	const endpoint = version === 'v1' ? '/customField' : '/list/custom_fields';

	const requestResult = await theHiveApiRequest.call(this, 'GET', endpoint as string);

	const returnData: INodePropertyOptions[] = [];

	// Convert TheHive3 response to the same format as TheHive 4
	const customFields =
		version === 'v1'
			? requestResult
			: Object.keys(requestResult as IDataObject).map((key) => requestResult[key]);

	for (const field of customFields) {
		returnData.push({
			name: `${field.name}: ${field.reference}`,
			value: field.reference,
			description: `${field.type}: ${field.description}`,
		} as INodePropertyOptions);
	}

	return returnData;
}

export async function loadObservableTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const version = (await this.getCredentials('theHiveApi')).apiVersion;
	const endpoint = version === 'v1' ? '/observable/type?range=all' : '/list/list_artifactDataType';

	const dataTypes = await theHiveApiRequest.call(this, 'GET', endpoint as string);

	let returnData: INodePropertyOptions[] = [];

	if (version === 'v1') {
		returnData = dataTypes.map((dataType: IDataObject) => {
			return {
				name: dataType.name as string,
				value: dataType.name as string,
			};
		});
	} else {
		returnData = Object.keys(dataTypes as IDataObject).map((key) => {
			const dataType = dataTypes[key] as string;

			return {
				name: dataType,
				value: dataType,
			};
		});
	}

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
