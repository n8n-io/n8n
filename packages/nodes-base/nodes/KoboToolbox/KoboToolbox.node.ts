import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  IDataObject,
  INodeExecutionData,
  INodeType,
  IHttpRequestOptions,
  INodeTypeDescription,
} from 'n8n-workflow';

export class KoboToolbox implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'KoboToolbox',
    name: 'koboToolbox',
    icon: 'file:koboToolbox.svg',
    group: ['transform'],
    version: 1,
    description: 'Work with KoboToolbox forms and submissions',
    defaults: {
      name: 'KoboToolbox',
      color: '#64C0FF',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'koboToolboxApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
          {
            name: 'Form',
            value: 'form',
          },
          {
            name: 'Submission',
            value: 'submission',
          },
        ],
        default: 'submission',
        required: true,
        description: 'Resource to consume',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
          show: {
            resource: [
              'form',
            ],
          },
        },
        options: [
          {
            name: 'Get',
            value: 'get',
            description: 'Retrieve a form definition',
          },
        ],
        default: 'get',
        description: 'The operation to perform.',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
          show: {
            resource: [
              'submission',
            ],
          },
        },
        options: [
          {
            name: 'Query',
            value: 'query',
            description: 'Query matching submissions',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a single submission',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a single submission',
          },
        ],
        default: 'query',
        description: 'The operation to perform.',
      },
      {
        displayName: 'Form ID',
        name: 'asset_uid',
        type: 'string',
        required: true,
        displayOptions: {
        },
        default:'',
        description:'Form id (e.g. aSAvYreNzVEkrWg5Gdcvg)',
      },
      {
        displayName: 'Start',
        name: 'start',
        type: 'number',
        required: false,
        displayOptions: {
          show: {
            resource: [
              'submission',
            ],
            operation: [
              'query',
            ],
          },
        },
        default: 0,
        description:'Offset from the result set',
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        required: false,
        displayOptions: {
          show: {
            resource: [
              'submission',
            ],
            operation: [
              'query',
            ],
          },
        },
        default: 30000,
        description:'Max records to return (up to 30000)',
      },
      {
        displayName: 'Submission id',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: [
              'submission',
            ],
            operation: [
              'get',
              'delete',
            ],
          },
        },
        default: '',
        description:'Submission id',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
          show: {
            resource: [
              'submission',
            ],
            operation: [
              'query',
            ],
          },
        },
        default: {},
        options: [
          {
            displayName: 'Query',
            name: 'query',
            type: 'json',
            required: false,
            displayOptions: {
              show: {
                resource: [
                  'submission',
                ],
                operation: [
                  'query',
                ],
              },
            },
            default:'',
            description:'Query for matching submissions, in MongoDB JSON format (e.g. {"_submission_time":{"$lt":"2021-10-01T01:02:03"}})',
          },
          {
            displayName: 'Fields',
            name: 'fields',
            type: 'string',
            required: false,
            default: '',
            description:'Comma-separated list of fields to retrieve (e.g. _submission_time,_submitted_by)',
          },
          {
            displayName: 'Sort',
            name: 'sort',
            type: 'string',
            required: false,
            displayOptions: {
              show: {
                resource: [
                  'submission',
                ],
                operation: [
                  'query',
                ],
              },
            },
            default: '',
            description:'Sort predicates, in Mongo JSON format (e.g. {"_submission_time":1})',
          },
        ],
      },
    ],
  };
  
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    let responseData;
    let returnData: any[] = [];
    const items = this.getInputData();
    const resource  = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;
    const credentials = await this.getCredentials('koboToolboxApi') as IDataObject;
    
    
    const baseOptions = {
      baseURL: credentials.URL,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${credentials.token}`,
      },
    }
    
    for (let i = 0; i < items.length; i++) {
      const asset_uid = this.getNodeParameter('asset_uid', i) as string;

      if (resource === 'submission') {
        if (operation === 'query') {
          const query = this.getNodeParameter('query', i) as string;
          const limit = this.getNodeParameter('limit', i) as number;
          const start = this.getNodeParameter('start', i) as number;
          const fields = this.getNodeParameter('fields', i) as string;
          const sort  = this.getNodeParameter('sort', i) as string;
          
          const options: IHttpRequestOptions = {
            url: `/api/v2/assets/${asset_uid}/data`,
            params: {
              start,
              limit,
              ...(query  && {query}),
              ...(sort   && {sort}),
              ...(fields && {fields: JSON.stringify(fields.split(',').map(String.prototype.trim))}),
            },
            ...baseOptions,
          };
          
          // This is a paginated response, return the list
          const response = await this.helpers.httpRequest(options);
          responseData = response.results ? response.results : null;
        }
        
        if (operation === 'get') {
          const id = this.getNodeParameter('id', 0) as string;
          
          const options: IHttpRequestOptions = {
            url: `/api/v2/assets/${asset_uid}/data/${id}`,
            ...baseOptions,
          };
          
          responseData = [await this.helpers.httpRequest(options)];
        }
        
        if (operation === 'delete') {
          const id = this.getNodeParameter('id', 0) as string;
          
          const options: IHttpRequestOptions = {
            method: 'DELETE',
            url: `/api/v2/assets/${asset_uid}/data/${id}`,
            ...baseOptions,
          };
          
          responseData = [await this.helpers.httpRequest(options)];
        }
      }
      
      if (resource === 'form') {
        if (operation === 'get') {
          const options: IHttpRequestOptions = {
            url: `/api/v2/assets/${asset_uid}`,
            ...baseOptions,
          };
          
          responseData = [await this.helpers.httpRequest(options)];
        }
      }
      
      if (responseData) {
        returnData = returnData.concat(responseData);
      }
    }
    // Map data to n8n data
    return [this.helpers.returnJsonArray(returnData)];
  }
}
