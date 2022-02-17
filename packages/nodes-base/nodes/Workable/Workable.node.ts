import {
    IExecuteFunctions,
} from 'n8n-core';

import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import {
    workableApiRequest,
} from './GenericFunctions';

export class Workable implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Workable',
        name: 'workable',
        icon: 'file:workable.png',
        group: ['transform'],
        version: 1,
        description: 'Consume Workable API',
        defaults: {
            name: 'workable',
            color: '#1A82e2',
        },
        inputs: ['main'],
        outputs: ['main'],
		credentials: [
			{
				name: 'workableApi',
				required: true,
			},
		],
        properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'API Key',
						value: 'apiKey',
					},
				],
				default: 'apiKey',
				description: 'The resource to operate on.',
			},
            {
				displayName: 'Subdomain',
				name: 'subdomain',
				type: 'string',
                default: '',
				required: true,
				description: 'The accounts subdomain.',
			},
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                options: [
                    {
                        name: 'Candidates',
                        value: 'candidates',
                    },
                ],
                default: 'candidates',
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
                            'candidates',
                        ],
                    },
                },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a candidate',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all candidates',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},
            {
				displayName: 'Candidate ID',
				name: 'candidateId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'candidates',
						],
						operation: [
							'get',
						],
					},
				},
			},
        ],
    };
    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			try {
				if (resource === 'candidates') {
					if (operation === 'get') {
                        //https://workable.readme.io/docs/job-candidates-create
						const id = this.getNodeParameter('candidateId', i) as string;
                        const candidate = await workableApiRequest.call(this,'GET', `/${resource}/${id}`);
                        returnData.push(candidate);
                        continue;
                    }
                } 
                if (resource === 'candidates') {
					if (operation === 'getAll') {
                        //https://workable.readme.io/docs/job-candidates-create
                        const candidates = await workableApiRequest.call(this,'GET', `/${resource}`);
                        returnData.push(...candidates);
                    }
                }
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
        return [this.helpers.returnJsonArray(returnData)];
    }    
}
