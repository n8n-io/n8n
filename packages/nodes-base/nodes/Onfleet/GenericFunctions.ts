import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodePropertyOptions,
	JsonObject,
	NodeApiError
} from 'n8n-workflow';
import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import * as moment from 'moment-timezone';

export async function onfleetApiRequest(
	this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	apikey: string,
	resource: string,
	body: any = {}, // tslint:disable-line:no-any
	qs?: any, // tslint:disable-line:no-any
	uri?: string): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Basic ${apikey}`,
			'User-Agent': 'n8n-onfleet',
		},
		method,
		body,
		qs,
		uri: uri || `https://onfleet.com/api/v2/${resource}`,
		json: true,
	};
	try {
		//@ts-ignore
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject); // TODO: Check error
	}
}

export const resourceLoaders = {
	async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
			const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');
			const teams = await onfleetApiRequest.call(this, 'GET', encodedApiKey, 'teams') as IDataObject[];
			return teams.map(({name = '', id: value = ''}) => ( {name, value} )) as INodePropertyOptions[];
		} catch (error) {
			return [];
		}
	},

	async getWorkers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
			const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');
			const workers = await onfleetApiRequest.call(this, 'GET', encodedApiKey, 'workers') as IDataObject[];
			return workers.map(({name = '', id: value = ''}) => ( {name, value} )) as INodePropertyOptions[];
		} catch (error) {
			return [];
		}
	},

	async getAdmins (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
			const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');
			const admins = await onfleetApiRequest.call(this, 'GET', encodedApiKey, 'admins') as IDataObject[];
			return admins.map(({name = '', id: value = ''}) => ( {name, value} )) as INodePropertyOptions[];
		} catch (error) {
			return [];
		}
	},

	async getHubs (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
			const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');
			const hubs = await onfleetApiRequest.call(this, 'GET', encodedApiKey, 'hubs') as IDataObject[];
			return hubs.map(({name = '', id: value = ''}) => ( {name, value} )) as INodePropertyOptions[];
		} catch (error) {
			return [];
		}
	},

	async getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const returnData = [] as INodePropertyOptions[];
		for (const timezone of moment.tz.names()) {
			returnData.push({
				name: timezone,
				value: timezone,
			});
		}
		return returnData;
	},
};
