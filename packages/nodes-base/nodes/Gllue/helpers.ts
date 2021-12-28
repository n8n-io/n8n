import {OptionsWithUri} from "request";
import {IExecuteFunctions} from 'n8n-core';
import {IDataObject, LoggerProxy as Logger} from "n8n-workflow";

const crypto = require('crypto');
const querystring = require('querystring');

export function getCurrentTimeStamp(): string {
	const dateTime = Date.now();
	return dateTime.toString();
}

export function connectWithComma(left: string, right: string): string {
	return `${left},${right},`;
}

export function get16TimesLength(input: number): number {
	const padLength = 16;
	const remainder = input % padLength;
	return remainder ? input - remainder + padLength : input;
}

export function padWithSpaceIn16Times(data: string): string {
	const paddingLength = get16TimesLength(data.length);
	return data.padEnd(paddingLength, ' ');
}

export function encryptAES(message: string, aesKey: string): string {
	const iv = '0000000000000000';
	const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, iv);
	cipher.write(message);
	cipher.end();

	const encrypted = cipher.read();
	return encrypted.toString('base64');
}

export function generateTokenWithAESKey(timestamp: string, email: string, aesKey: string): string {
	const data = connectWithComma(timestamp, email);
	const messageToEncrypt = padWithSpaceIn16Times(data);
	const encrypted = encryptAES(messageToEncrypt, aesKey);
	return encodeURIComponent(encrypted);
}

export async function gllueApiRequest(
	this: IExecuteFunctions,
	method: string,
	api_path: string,
	query_string: IDataObject = {},
	body: IDataObject = {},
	credentials: IDataObject = {},
	) {
		credentials = Object.keys(credentials) ? credentials: await this.getCredentials('gllueApi') as IDataObject
		const options : OptionsWithUri = generateGllueApiUriOptions(credentials, method, api_path, query_string, body);
		return await this.helpers.request(options);
}

export function generateGllueApiUriOptions(
	credentials: IDataObject,
	method: string,
	apiPath: string,
	queryString: IDataObject = {},
	body: IDataObject = {},
){
	const timestamp = getCurrentTimeStamp();
	const token = generateTokenWithAESKey( timestamp, credentials.apiUsername as string, credentials.apiAesKey as string);
	const qs = Object.assign(queryString, {private_token: token});

	let uri = `${credentials.apiHost}${apiPath}?${querystring.stringify(qs)}`;
	const options : OptionsWithUri = {
		headers: {'Accept': 'application/json'},
		method: method,
		body: body,
		uri: uri,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	return options;
}

function getGllueApiUri(apiHost: string, apiPath: string, queryString: IDataObject = {}){
	let uri = `${apiHost}${apiPath}`;
	if (Object.keys(queryString).length){
		uri = `${uri}?${querystring.stringify(queryString)}`;
	}
	return uri;
}

