import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from "n8n-core";
import { IDataObject, IHookFunctions, NodeApiError } from "n8n-workflow";
import { OptionsWithUri } from "request";
import {
	NODE_SETTINGS
} from './NodeConstants'

const BIN_STRING_REGEX = /Bin '(\d+-\d+)'/g
const BIN_URL_REGEX = /https:\/\/www\.toptal\.com\/developers\/postbin\/b\/(\d+-\d+)/g

export async function createBinRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
) {
	let options: OptionsWithUri = {
		method: 'POST',
		uri: `${NODE_SETTINGS.BASE_URL}${NODE_SETTINGS.CREATE_BIN_URL}`,
		json: true,
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function getBinRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	binId: string
) {
	let options: OptionsWithUri = {
		method: 'GET',
		uri: `${NODE_SETTINGS.BASE_URL}${NODE_SETTINGS.GET_BIN_URL}${binId}`,
		json: true,
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function deleteBinRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	binId: string
) {
	let options: OptionsWithUri = {
		method: 'DELETE',
		uri: `${NODE_SETTINGS.BASE_URL}${NODE_SETTINGS.DELETE_BIN_URL}${binId}`,
		json: true,
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function testBinRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	binId: string,
	body: IDataObject,
) {
	let options: OptionsWithUri = {
		uri: `${NODE_SETTINGS.BASE_URL}${NODE_SETTINGS.TEST_BIN_URL}${binId}`,
		method,
		body,
		json: true,
	}

	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function getRequestRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	binId: string,
	reqId: string
) {
	let options: OptionsWithUri = {
		uri: `${NODE_SETTINGS.BASE_URL}/developers/postbin/api/bin/${binId}/req/${reqId}`,
		json: true,
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

// /developers/postbin/api/bin/:binId/req/shift
export async function shiftRequestRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	binId: string,
) {
	let options: OptionsWithUri = {
		uri: `${NODE_SETTINGS.BASE_URL}/developers/postbin/api/bin/${binId}/req/shift`,
		json: true,
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function parseBinId(binId: string) {
	let string_match = BIN_STRING_REGEX.exec(binId)
	let url_match = BIN_URL_REGEX.exec(binId);

	if (string_match) {
		return string_match[1];
	}

	if(url_match) {
		return url_match[1];
	}
 return binId;
}
