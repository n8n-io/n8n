import { ICredentialDataDecryptedObject } from 'n8n-workflow';

export function constructRequestOptions(credentials: ICredentialDataDecryptedObject, method: 'GET'|'POST'|'PUT'|'DELETE', urlPostfix: string, body?: any) {
	return {
		resolveWithFullResponse: true,
		method: method,
		auth: {
			user: credentials.user as string,
			pass: credentials.apiKey as string,
		},
		body: body,
		uri: credentials.deviceUrl + '/api/v2/device/' + urlPostfix,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
		json: true
	};
}
