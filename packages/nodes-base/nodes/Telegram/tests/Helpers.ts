import get from 'lodash/get';
import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';

export const telegramNode: INode = {
	id: 'b3039263-29ad-4476-9894-51dfcc5a706d',
	name: 'Telegram node',
	typeVersion: 1.2,
	type: 'n8n-nodes-base.telegram',
	position: [0, 0],
	parameters: {
		resource: 'callback',
		operation: 'answerQuery',
	},
};

export const createMockExecuteFunction = (nodeParameters: IDataObject) => {
	const fakeExecuteFunction = {
		getInputData() {
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
			return telegramNode;
		},
		helpers: {},
		continueOnFail: () => false,
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};
