import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { INodePropertyOptions } from 'n8n-workflow';

import { OptionsWithUri } from 'request';
/**
 * Make an API request to Twake
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function twakeApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: object): Promise<any> {
  const credentials = this.getCredentials('twakeApi');
  if (credentials === undefined) {
    throw new Error('No credentials got returned!');
  }
  let hostUrl = "";
  if(credentials.useInSaas == true){
    hostUrl = "https://connectors.albatros.twakeapp.com/n8n/";
  }
  else{
    hostUrl = credentials.host+(credentials.host.toString().substr(credentials.host.toString().length-1)=="/"?"n8n/":"/n8n/");
  }
  const options: OptionsWithUri = {
    headers: {
      Authorization: `Bearer ${credentials.key}`,
    },
    method,
    body: body,
    qs: query,
    uri: hostUrl+endpoint,
    json: true,
  };
  try {
    return await this.helpers.request!(options);
  } catch (error) {
    if( error.error.code == "ECONNREFUSED"){
      throw new Error('Twake host is not accessible!');

    }
    if (error.statusCode === 401) {
      // Return a clear error
      throw new Error('The Twake credentials are not valid!');
    }

    if (error.response && error.response.body && error.response.body.errors) {
      // Try to return the error prettier
      const errorMessages = error.response.body.errors.map((errorData: { message: string }) => {
        return errorData.message;
      });
      throw new Error(`Twake error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
    }

    // If that data does not exist for some reason return the actual error
    throw error;
  }
}

export async function unid(): Promise<string> {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

export async function loadChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const endpoint = 'channel';
  const responseData = await twakeApiRequest.call(this, 'POST', endpoint, {});
  if (responseData === undefined) {
    throw new Error('No data got returned');
  }

  const returnData: INodePropertyOptions[] = [];
  for (const channel of responseData) {
    returnData.push({
      name: channel.name,
      value: channel.id,
    });
  }
  return returnData;
}
