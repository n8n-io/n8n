import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import {
	POSTBIN_VALUES,
	RESOURCES,
	BIN_OPERATIONS,
	BIN_FIELDS,
	REQUEST_OPERATIONS,
	REQUEST_FIELDS
} from './NodeConstants'

import {
	binOperations,
	binFields,
} from './BinDescription';

import {
	requestOperations,
	requestFields,
} from './RequestDescription';

import {
	createBinRequest,
	deleteBinRequest,
	getBinRequest,
	getRequestRequest,
	parseBinId,
	shiftRequestRequest,
	testBinRequest,
} from './GenericFunctions'

export class PostBin implements INodeType {
	description: INodeTypeDescription = {
		displayName: POSTBIN_VALUES.DISPLAY_NAME,
		name: 'postBin',
		icon: 'file:postbin.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Consume PostBin API',
		defaults: {
			name: POSTBIN_VALUES.DISPLAY_NAME,
			color: POSTBIN_VALUES.BRAND_COLOR
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: RESOURCES.BIN.name,
						value: RESOURCES.BIN.value
					},
					{
						name: RESOURCES.REQUEST.name,
						value: RESOURCES.REQUEST.value
					}
				],
				default: RESOURCES.BIN.value,
				required: true,
				description: 'Bin to work with'
			},
			...binOperations,
			...requestOperations,
			...binFields,
			...requestFields,
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			// --- BIN OPERATIONS:
			if (resource === RESOURCES.BIN.value) {
				// ------ CREATE NEW BIN:
				if (operation === BIN_OPERATIONS.CREATE.value) {
					responseData = await createBinRequest.call(this);
					responseData = {
						[BIN_FIELDS.BIN_ID.name]: responseData[BIN_FIELDS.BIN_ID.name]
					};
					// ------ GET BIN INFO:
				} else if (operation === BIN_OPERATIONS.GET.value) {
					let binId = this.getNodeParameter(BIN_FIELDS.BIN_ID.name, 0) as string;

					binId = parseBinId(binId);
					responseData = await getBinRequest.call(this, binId);
					// ------ DELETE BIN:
				} else if (operation === BIN_OPERATIONS.DELETE.value) {
					let binId = this.getNodeParameter(BIN_FIELDS.BIN_ID.name, 0) as string;

					binId = parseBinId(binId);
					responseData = await deleteBinRequest.call(this, binId);
				} else if (operation === BIN_OPERATIONS.TEST.value) {
					let binId = this.getNodeParameter(BIN_FIELDS.BIN_ID.name, 0) as string;
					let content = this.getNodeParameter(BIN_FIELDS.BIN_CONTENT.name, 0) as string;

					binId = parseBinId(binId);
					const body: IDataObject = {}
					if(content !== '') {
						body.content = content;
					}
					let response = await testBinRequest.call(this, 'POST', binId, body);
					responseData = {
						'Status': 'Sent',
						'Request ID': response,
						'Bin ID': binId
					}
				}
			}
			// --- REQUEST OPERATIONS:
			else if (resource === RESOURCES.REQUEST.value) {
				// ------ GET REQUEST INFO:
				if (operation === REQUEST_OPERATIONS.GET.value) {
					let binId = this.getNodeParameter(BIN_FIELDS.BIN_ID.name, 0) as string;
					binId = parseBinId(binId);
					let reqId = this.getNodeParameter(REQUEST_FIELDS.REQ_ID.name, 0) as string;

					responseData = await getRequestRequest.call(this, binId, reqId);
				}
				else if (operation === REQUEST_OPERATIONS.SHIFT.value) {
					let binId = this.getNodeParameter(BIN_FIELDS.BIN_ID.name, 0) as string;
					binId = parseBinId(binId);
					responseData = await shiftRequestRequest.call(this, binId);
				}
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
