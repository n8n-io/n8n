import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';

export const node: INode = {
	id: '1',
	name: 'Gotify node',
	typeVersion: 1,
	type: 'n8n-nodes-base.gotify',
	position: [10, 10],
	parameters: {},
};

export const createMockExecuteFunction = (nodeParameters: IDataObject) => {
	return {
		getInputData(): INodeExecutionData[] {
			return [{ json: {} }];
		},
		getNodeParameter(
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode() {
			return node;
		},
		helpers: {
			constructExecutionMetaData,
			returnJsonArray: (data: IDataObject | IDataObject[]) => {
				const dataArray = Array.isArray(data) ? data : [data];
				return dataArray.map((item) => ({ json: item })) as INodeExecutionData[];
			},
		},
		continueOnFail: () => false,
	} as unknown as IExecuteFunctions;
};
