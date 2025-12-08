import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	ILoadOptionsFunctions,
	INode,
} from 'n8n-workflow';

export const docsNode: INode = {
	id: '11',
	name: 'Google Docs node',
	typeVersion: 3,
	type: 'n8n-nodes-base.googleDocs',
	position: [42, 42],
	parameters: {},
};

export const createMockExecuteFunction = (
	nodeParameters: IDataObject,
	node: INode,
	continueOnFail = false,
) => {
	const fakeExecuteFunction = {
		getInputData: () => [{}],
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
		getCredentials: () => ({}),
		helpers: {
			constructExecutionMetaData,
			returnJsonArray: () => [],
			prepareBinaryData: () => {},
			httpRequest: () => {},
		},
		continueOnFail: () => continueOnFail,
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

export const createLoadOptionsThis = (
	nodeParameters: Record<string, unknown>,
	node: INode,
): ILoadOptionsFunctions => {
	return {
		getNode() {
			return node;
		},
		getNodeParameter: (name: string) => nodeParameters[name],
		// the rest of the properties are not used because we are mocking googleApiRequestAllItems
	} as unknown as ILoadOptionsFunctions;
};
