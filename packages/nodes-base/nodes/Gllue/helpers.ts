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
		public paginateBy = 25,
		public orderBy = '-id',
		public page = 1,
	) {
	}
}

export function gllueUrlBuilder(host: string, resource: string, option = 'simple_list_with_ids', urlParams: UrlParams): string {
	const baseUrl = `${host}\\rest\\${resource}\\${option}\\`;
	const params = [];
	if (!urlParams) {
		return baseUrl;
	}

	if (urlParams.gql !== undefined) {
		let gql: string;
		if (urlParams.gql !== '') {
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
	}
	if (urlParams.fields !== undefined) {
		params.push(`fields=${urlParams.fields}`);
	}
	if (urlParams.paginateBy !== undefined) {
		params.push(`paginate_by=${urlParams.paginateBy}`);
	}
	if (urlParams.orderBy !== undefined) {
		params.push(`ordering=${urlParams.orderBy}`);
	}
	if (urlParams.page !== undefined) {
		params.push(`page=${urlParams.page}`);
	}

	return `${baseUrl}?${params.join('&')}`;
}
