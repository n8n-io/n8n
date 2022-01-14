import {
    IHookFunctions,
    IPollFunctions
 } from 'n8n-core';
 
 import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    ILoadOptionsFunctions
 } from 'n8n-workflow';
 
 
 import {
    raindropApiRequest,
 } from './GenericFunctions';
 
import * as moment from 'moment';
 
 
 
 export class RaindropTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Raindrop Trigger',
        name: 'raindropTrigger',
        icon: 'file:raindrop.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["event"]}}',
        description: 'Starts the workflow when a new bookmark is added to Raindrop',
        defaults: {
            name: 'Raindrop Trigger',
        },
        credentials: [
            {
                name: 'raindropOAuth2Api',
                required: true,
            },
        ],
        polling: true,
        inputs: [],
        outputs: ['main'],
        properties: [
            {
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Bookmark',
						value: 'bookmark',
					},
				],
				default: 'bookmark',
				description: 'Resource to consume',
			},
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                default: 'get',
                description: 'Operation to perform',
                options: [
                    {
                        name: 'Get',
                        value: 'get',
                    },
		        ],
                displayOptions: {
                    show: {
                        resource: [
                            'bookmark',
                        ],
                    },
                },
            },
            {
                displayName: 'Collection ID',
                name: 'collectionId',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getCollections',
                },
                default: [],
                required: true,
                description: 'The ID of the collection from which to retrieve the bookmark.',
                displayOptions: {
                    show: {
                        resource: [
                            'bookmark',
                        ],
                        operation: [
                            'get',
                        ],
                    },
                },
            },
        ],
    };

    // Get the user's collections.
    methods = {
        loadOptions: {
            async getCollections(this: ILoadOptionsFunctions) {
				const responseData = await raindropApiRequest.call(this, 'GET', '/collections', {}, {});
				return responseData.items.map((item: { title: string, _id: string }) => ({
					name: item.title,
					value: item._id,
				}));
			},
        }
    }

    async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
        // Getting the resource and operation parameters.
        const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

        // Setting the getWorkflowStaticData for storing timestamp.
        const webhookData = this.getWorkflowStaticData('node')
		const now = moment().utc().format();
		const startDate = webhookData.lastTimeChecked as string || now;
        let responseData
        if(resource === 'bookmark'){
            if(operation === 'get'){
                // Get the collection to check the bookmarks of.
                const collectionId = this.getNodeParameter('collectionId');
                const endpoint = `/raindrops/${collectionId}`;
                responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
                // Select the latest bookmark from the entire response array.
                responseData = responseData.items[0]
                if(responseData){
                    webhookData.lastTimeChecked = responseData.created 
                    if(responseData.created > startDate){
                        return [this.helpers.returnJsonArray(responseData)]
                    }
                }
            }
        }
        return null
    }
 }
 