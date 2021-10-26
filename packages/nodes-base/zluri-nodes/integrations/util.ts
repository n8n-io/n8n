import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';


/**
 * Make an API request using zluri
 *
 * @param {IHookFunctions} this
 * @param {OptionsWithUri} options
 * @returns {Promise<any>}
 */
export async function zluriOAuthApiRequest(this:  IExecuteFunctions, options:OptionsWithUri): Promise<any> { 
    
    const credentials = await getZluriCredentials.call(this)
    const credentialData = JSON.parse(credentials);
    options.headers = Object.assign({}, options.headers, {'Authorization':'Bearer '+credentialData.access_token});
    return await this.helpers.request!(options);
}

/**
 * Get zluri credentials
 *
 * @param {IHookFunctions} this
 * @returns {Promise<any>}
 */
 export async function getZluriCredentials(this:  IExecuteFunctions): Promise<any> { 
    const code = this.getNodeParameter('code',0)
    const secretOptions = {
        method:'get',
        uri:'https://integrations-dev.zluri.com/secretStore/fetchSecrets',
        qs:{code}
    }
    return await this.helpers.request!(secretOptions);
    
}
