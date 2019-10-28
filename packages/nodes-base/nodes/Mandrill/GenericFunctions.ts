import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
    ILoadOptionsFunctions,
    IExecuteSingleFunctions
} from 'n8n-core';

import * as _ from 'lodash';

export async function mandrillApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resource: string, method: string, action: string, body: any = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any
    const credentials = this.getCredentials('mandrillApi');

    if (credentials === undefined) {
		throw new Error('No credentials got returned!');
    }
    
    const data = Object.assign({ }, body, { key: credentials.apiKey })

	const endpoint = 'mandrillapp.com/api/1.0';

	const options: OptionsWithUri = {
		headers: headers,
		method,
		uri: `https://${endpoint}${resource}${action}.json`,
        body: data,
        json: true
    };
    

	try {
        return await this.helpers.request!(options);
	} catch (error) {
		console.error(error);

		const errorMessage = error.response.body.message || error.response.body.Message;
		if (error.name === 'Invalid_Key') {
			throw new Error('The provided API key is not a valid Mandrill API key');
		} else if (error.name === 'ValidationError') {
			throw new Error('The parameters passed to the API call are invalid or not provided when required');
        } else if (error.name === 'GeneralError') {
			throw new Error('An unexpected error occurred processing the request. Mandrill developers will be notified.');
        }

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
    }
}
    
    export function getToEmailArray(toEmail: String): Array<any> { // tslint:disable-line:no-any
        let toEmailArray
        if (toEmail.split(',').length > 0) {
            const array = toEmail.split(',')
            toEmailArray = _.map(array, (email) => {
                return {
                    email: email,
                    type: 'to'
                }
            })
        } else {
            toEmailArray = [{
                email: toEmail,
                type: 'to'
            }]
        }
        return toEmailArray
    }

    export function getGoogleAnalyticsDomainsArray(string: String): Array<any> { 
        let array = []
        if (string.split(',').length > 0) {
            array = string.split(',')
        } else {
            array = [string]
        }
        return array
    }

    export function getTags(string: String): Array<any> { 
        let array = []
        if (string.split(',').length > 0) {
            array = string.split(',')
        } else {
            array = [string]
        }
        return array
    }

    export function validateJSON(json: any): any {
        let result
        try {
            result = JSON.parse(json)
        } catch (exception) {
            result = []
        }
        return result
    }
