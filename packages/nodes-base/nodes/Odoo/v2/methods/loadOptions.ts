import { capitalCase } from 'change-case';
import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { odooGetRequestCredentials, odooHTTPRequest } from '../GenericFunctions';

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const odooRequestCredentials = await odooGetRequestCredentials.call(this);

	const response = (await odooHTTPRequest.call(
		this,
		odooRequestCredentials,
		'ir.model',
		'search_read',
		[],
		{ fields: ['name', 'model'] },
	)) as unknown as IDataObject[];

	const options = response.map((model) => {
		return {
			name: model.name,
			value: model.model,
			description: `model: ${model.model}`,
		};
	});
	return options as INodePropertyOptions[];
}

export async function getModelFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	let resource;
	resource = this.getCurrentNodeParameter('resource') as string;
	if (resource === 'custom') {
		resource = this.getCurrentNodeParameter('customResource') as string;
		if (!resource) return [];
	}

	const odooRequestCredentials = await odooGetRequestCredentials.call(this);

	const response = await odooHTTPRequest.call(
		this,
		odooRequestCredentials,
		resource,
		'fields_get',
		[],
		{ attributes: ['string', 'type', 'help', 'required', 'name'] },
	);

	const options = Object.entries(response).map(([key, field]) => {
		const optionField = field as { [key: string]: string };
		try {
			optionField.name = capitalCase(optionField.name);
		} catch (error) {
			optionField.name = optionField.string;
		}
		return {
			name: optionField.name,
			value: key,
			// nodelinter-ignore-next-line
			description: `name: ${key}, type: ${optionField?.type} required: ${optionField?.required}`,
		};
	});

	return options.sort((a, b) => a.name?.localeCompare(b.name) || 0);
}
