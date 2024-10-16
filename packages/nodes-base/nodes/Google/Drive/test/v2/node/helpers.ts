import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';

import { get } from 'lodash';
import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';

export const driveNode: INode = {
	id: '11',
	name: 'Google Drive node',
	typeVersion: 3,
	type: 'n8n-nodes-base.googleDrive',
	position: [42, 42],
	parameters: {},
};

export const createMockExecuteFunction = (
	nodeParameters: IDataObject,
	node: INode,
	continueOnFail = false,
) => {
	const fakeExecuteFunction = {
		getNodeParameter(
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject | undefined,
			options?: IGetNodeParameterOptions | undefined,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode() {
			return node;
		},
		helpers: {
			constructExecutionMetaData,
			returnJsonArray,
			prepareBinaryData: () => {},
			httpRequest: () => {},
		},
		continueOnFail: () => continueOnFail,
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};
