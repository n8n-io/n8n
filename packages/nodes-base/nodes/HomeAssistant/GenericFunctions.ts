import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type { IDataObject, INodePropertyOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function homeAssistantApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('homeAssistantApi');

	let options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
		},
		method,
		qs,
		body,
		uri:
			uri ??
			`${credentials.ssl === true ? 'https' : 'http'}://${credentials.host}:${
				credentials.port
			}/api${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	try {
		if (this.helpers.request) {
			return await this.helpers.request(options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function getHomeAssistantEntities(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	domain = '',
) {
	const returnData: INodePropertyOptions[] = [];
	const entities = await homeAssistantApiRequest.call(this, 'GET', '/states');
	for (const entity of entities) {
		const entityId = entity.entity_id as string;
		if (domain === '' || (domain && entityId.startsWith(domain))) {
			const entityName = (entity.attributes.friendly_name as string) || entityId;
			returnData.push({
				name: entityName,
				value: entityId,
			});
		}
	}
	return returnData;
}

export async function getHomeAssistantServices(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	domain = '',
) {
	const returnData: INodePropertyOptions[] = [];
	const services = await homeAssistantApiRequest.call(this, 'GET', '/services');
	if (domain === '') {
		// If no domain specified return domains
		const domains = services.map(({ domain: service }: IDataObject) => service as string).sort();
		returnData.push(
			...(domains.map((service: string) => ({
				name: service,
				value: service,
			})) as INodePropertyOptions[]),
		);
		return returnData;
	} else {
		// If we have a domain, return all relevant services
		const domainServices = services.filter((service: IDataObject) => service.domain === domain);
		for (const domainService of domainServices) {
			for (const [serviceID, value] of Object.entries(domainService.services as IDataObject)) {
				const serviceProperties = value as IDataObject;
				const serviceName = serviceProperties.description || serviceID;
				returnData.push({
					name: serviceName as string,
					value: serviceID,
				});
			}
		}
	}
	return returnData;
}
