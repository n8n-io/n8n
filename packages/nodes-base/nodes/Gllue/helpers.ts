import {OptionsWithUri} from 'request';
import {IDataObject} from 'n8n-workflow';
import {GllueEvent} from './interfaces';
import {BLUE_HOST, BLUE_TOKEN_KEY, DEV_NODE_ENV, HOST_MAPPING, TOKEN_KEY} from './constants';
import * as moment from 'moment-timezone';
import {getHasuraAdminSecret} from "../utils/utilities";

const crypto = require('crypto');

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

export class UrlParams {
	constructor(
		public gql = '',
		public fields = 'id',
		public token = '',
		public paginateBy = 25,
		public page = 1,
		public orderBy = '-id',

	) {
	}
}

export function gllueUrlBuilder(host: string, resource: string, option = 'simple_list_with_ids', urlParams: UrlParams): string {
	const baseUrl = `${host}/rest/${resource}/${option}`;
	const params = [];
	if (!urlParams) {
		return baseUrl;
	}

	let gql: string;
	if (urlParams.gql !== undefined && urlParams.gql !== '') {
		const groups = urlParams.gql.split('&').map((group) => {
			const [name, value] = group.split('=');
			const encodedValue = encodeURIComponent(value);
			return `${name}=${encodedValue}`;
		});
		gql = encodeURIComponent(groups.join('&'));
	} else {
		gql = urlParams.gql;
	}
	params.push(`gql=${gql}`);

	params.push(`fields=${urlParams.fields}`);
	params.push(`paginate_by=${urlParams.paginateBy}`);
	params.push(`ordering=${urlParams.orderBy}`);
	params.push(`page=${urlParams.page}`);

	if (urlParams.token !== '') {
		const tokenKey = host === BLUE_HOST ? BLUE_TOKEN_KEY : TOKEN_KEY;
		params.push(`${tokenKey}=${urlParams.token}`);
	} else {
		throw new Error('Private Token is required');
	}

	return `${baseUrl}?${params.join('&')}`;
}

export function buildOptionWithUri(uriGenerated: string, method = 'GET', body: IDataObject = {}): OptionsWithUri {
	const options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
		},
		method,
		body,
		uri: uriGenerated,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	const adminSecret = getHasuraAdminSecret();
	if (adminSecret !== ''){
		// @ts-ignore
		options.headers['x-hasura-admin-secret'] = adminSecret;
	}
	return options;
}

// tslint:disable-next-line:no-any
export async function getResponseByUri(uriGenerated: string, requestMethod: any, method = 'GET', body: IDataObject = {}) {
	const options = buildOptionWithUri(uriGenerated, method, body);
	console.log(`request with ${options.uri}`);
	return await requestMethod(options);
}

export function convertEventPayload(item: GllueEvent):IDataObject{
	const info = JSON.parse(item.info);
	return {
		date: item.date,
		info,
		sign: item.sign,
	};
}

export function getOffSetDate(days: number):string{
	const date = moment().add(days, 'days');
	return date.format('YYYY-MM-DD');
}

export function buildConsentUrl( consentId: string): string {
	const stage = process.env.NODE_ENV || DEV_NODE_ENV;
	const validStageNames = Object.keys(HOST_MAPPING);
	if (!validStageNames.includes(stage)) {
		throw new Error(`Wrong stage name "${stage}", you should provide any of [${validStageNames}]`);
	}
	const host = HOST_MAPPING[stage];
	const postfix = stage === DEV_NODE_ENV ? '-test' : '';
	return `${host}/webhook${postfix}/consent/confirm?id=${consentId}`;
}

export function prepareGllueApiUpdateData(id: number|string, updateData: IDataObject): IDataObject {
	const result = Object.assign({}, updateData, {id:(typeof id === 'string')? parseInt(id, 10) : id});
	return {data: JSON.stringify(result)};
}
