import chardet from 'chardet';
import iconv from 'iconv-lite';
import { get } from 'lodash';
import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';

import * as moveTo from '../actions/moveTo.operation';

jest.mock('chardet', () => ({
	detect: jest.fn(),
}));

const createMockExecuteFunction = (
	nodeParameters: IDataObject,
	nodeMock: INode,
	continueBool = false,
	helpers = {},
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
			return nodeMock;
		},
		continueOnFail() {
			return continueBool;
		},
		helpers,
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

describe('Test ExtractFromFile, moveTo operation', () => {
	let mockNode: INode;

	beforeEach(() => {
		mockNode = {
			id: 'extract-from-file-node',
			name: 'Extract From File Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should call chardet to get the file encoding', async () => {
		(chardet.detect as jest.Mock).mockReturnValue('windows-1250');

		await moveTo.execute.call(
			createMockExecuteFunction(
				{
					options: {},
					binaryPropertyName: 'data',
					destinationKey: 'destinationKey',
				},
				mockNode,
				false,
				{
					getBinaryDataBuffer() {
						return iconv.encode('Příliš žluťoučký kůň', 'windows-1250');
					},
				},
			),
			[
				{
					binary: {
						data: {
							data: 'S2FybG92eSBWYXJ5IG3sc3RvIGzhem7tClD47WxpmiCebHWdb3Xoa/0ga/nyIPpw7Gwg7+FiZWxza+kg82R5Lgo=',
							mimeType: 'text/plain',
						},
					},
					json: {},
				},
			],
			'binaryToPropery',
		);

		expect(chardet.detect).toHaveBeenCalled();
	});
});
