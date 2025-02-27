import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  NodeConnectionType,
  IHttpRequestMethods,
  IHttpRequestOptions,
  IWebhookResponseData,
} from 'n8n-workflow';
import { IDataObject } from 'n8n-workflow';

export class FnShift implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FnShift',
    name: 'fnShift',
    icon: 'file:fnshift.svg',
    group: ['webhook'],
    version: 1,
    description: 'Handle FnShift webhook events and make API calls',
    defaults: {
      name: 'FnShift',
    },
    inputs: [{
      type: NodeConnectionType.Main,
      displayName: 'Input',
    }],
    outputs: [{
      type: NodeConnectionType.Main,
      displayName: 'Output',
    }],
    credentials: [
      {
        name: 'fnShiftApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'Update Data',
            value: 'updateData',
          },
          {
            name: 'Create Data',
            value: 'createData',
          },
        ],
        default: 'updateData',
        required: true,
      },
      {
        displayName: 'Model Name',
        name: 'modelName',
        type: 'string',
        default: '',
        required: true,
        description: 'Name of the FnShift model to update',
      },
      {
        displayName: 'Data',
        name: 'data',
        type: 'json',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['updateData', 'createData'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = await this.getCredentials('fnShiftApi');
    const operation = this.getNodeParameter('operation', 0) as string;
    const modelName = this.getNodeParameter('modelName', 0) as string;
    const data = this.getNodeParameter('data', 0) as string;

    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

    let method: IHttpRequestMethods;

    if (operation === 'updateData') {
      method = 'PUT';
    } else if (operation === 'createData') {
      method = 'POST';
    } else {
      throw new Error(`Unknown operation: ${operation}`);
    }

    const options: IHttpRequestOptions = {
      url: `${baseUrl}/api/${modelName}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiKey}`,
      },
      method,
      body: JSON.parse(data),
      json: true,
    };

    try {
      const response = await this.helpers.request(options);
      return [[{ json: response }]];
    } catch (error) {
      if (error.message) {
        throw new Error(`FnShift API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const bodyData = req.body as IDataObject;

    return {
      workflowData: [
        [
          {
            json: bodyData,
          },
        ],
      ],
    };
  }
}
