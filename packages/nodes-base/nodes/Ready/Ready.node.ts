import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';
import { RequestPromiseOptions } from 'request-promise-native';

const readyEndpoint = 'http://localhost:4000/graphql'

export class Ready implements INodeType {
  description: INodeTypeDescription = {
		displayName: 'Ready',
		name: 'ready',
		icon: 'file:Ready.svg',
		group: ['input'],
		version: 1,
		description: 'Makes a GraphQL request to Ready API and returns the received data',
		defaults: {
			name: 'Ready',
			color: '#E10098',
		},
		inputs: ['main'],
		outputs: ['main'],
    credentials: [
      {
        name: 'readyApi',
        required: true,
      }
    ],
		properties: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'json',
				default: '',
				description: 'GraphQL query',
				required: true,
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '',
				description: 'Query variables',
			},
		],
	};

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

    const items = this.getInputData();

    const credentials = this.getCredentials('readyApi') as IDataObject;

    let requestOptions: OptionsWithUri & RequestPromiseOptions;

    const returnItems: INodeExecutionData[] = [];
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const requestMethod = 'POST'
      const endpoint = readyEndpoint;
      const requestFormat = 'json';

      const { parameter }: { parameter?: Array<{ name: string, value: string }> } = this
        .getNodeParameter('headerParametersUi', itemIndex, {}) as IDataObject;
      const headerParameters = (parameter || []).reduce((result, item) => ({
        ...result,
        [item.name]: item.value,
      }), {});

      requestOptions = {
        headers: {
          'content-type': `application/${requestFormat}`,
          'Authorization': credentials.token,
          ...headerParameters,
        },
        method: requestMethod,
        uri: endpoint,
        simple: false,
        rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
      };

      const gqlQuery = this.getNodeParameter('query', itemIndex, '') as string;
      requestOptions.body = {
        query: gqlQuery,
        variables: this.getNodeParameter('variables', itemIndex, {}) as object,
        operationName: this.getNodeParameter('operationName', itemIndex, null) as string,
      };
      if (typeof requestOptions.body.variables === 'string') {
        try {
          requestOptions.body.variables = JSON.parse(requestOptions.body.variables || '{}');
        } catch (e) {
          throw new Error('Using variables failed:\n' + requestOptions.body.variables + '\n\nWith error message:\n' + e);
        }
      }
      if (requestOptions.body.operationName === '') {
        requestOptions.body.operationName = null;
      }
      requestOptions.json = true;

			const response = await this.helpers.request(requestOptions);

      returnItems.push({
        json: {
          'data': response,
        },
      });
		}

		return this.prepareOutputData(returnItems);
  }
}
