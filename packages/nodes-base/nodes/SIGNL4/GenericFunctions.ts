import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
} from 'n8n-workflow';

/**
 * Make an API request to MSG91
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 * @param {object} message
 * @returns {Promise<any>}
 */
export async function SIGNL4ApiRequest(this: IHookFunctions | IExecuteFunctions, message: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('SIGNL4Api');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	
	const teamsecret = credentials!.teamSecret as string;

	var response = null;
	try {
		response = await this.helpers.request({
			headers: {'Content-Type': 'application/json'},
			method: 'POST',
			body: message,
			qs: {},
			uri: `https://connect.signl4.com/webhook/${teamsecret}`,
			json: true
		});
	}
	catch (error) {
		
		if (error && error.message) {
			throw new Error(`Error sending the SIGNL4 request. Error: ${JSON.stringify(error.message)}`);
		}
			
		throw new Error('Error sending the SIGNL4 request.');

		throw error;
	}

	return response;
}


function setPayload(credentials: ICredentialDataDecryptedObject, o?: IDataObject) {
	if (!o) {
		o = {};
	}

	o.p = credentials!.teamSecret as string;
	o.json = 1;
	o.sendwith = 'n8n';

	return o;
}
