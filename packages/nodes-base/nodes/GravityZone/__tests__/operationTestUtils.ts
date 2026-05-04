// eslint-disable-next-line import-x/no-extraneous-dependencies
import { mockDeep } from 'jest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';

export type OperationModule = {
	execute: (this: IExecuteFunctions, i: number) => Promise<INodeExecutionData[]>;
	description: INodeProperties[];
};

export type GravityZoneApiRequest = (
	this: IExecuteFunctions | ILoadOptionsFunctions,
	resource: string,
	operation: string,
	body: IDataObject,
	apiVersion?: string,
) => Promise<IDataObject>;

type ParameterValue = NodeParameterValueType | IDataObject | IDataObject[];

const mockNode: INode = {
	id: 'test-node-id',
	name: 'GravityZone Test',
	type: 'n8n-nodes-base.gravityZone',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const mockConstructExecutionMetaData = (
	data: INodeExecutionData[],
	options: { itemData: { item: number } },
): INodeExecutionData[] =>
	data.map((item) => ({
		...item,
		pairedItem: { item: options.itemData.item },
	}));

const toOptionValues = (property: INodeProperties): Array<string | number | boolean> => {
	if (!Array.isArray(property.options)) {
		return [];
	}

	return property.options
		.filter(
			(option): option is INodePropertyOptions =>
				typeof (option as INodePropertyOptions).value !== 'undefined',
		)
		.map((option) => option.value);
};

const pickOptionValue = (property: INodeProperties): string | number | boolean => {
	const options = toOptionValues(property);
	if (options.length === 0) {
		if (typeof property.default === 'string') return property.default;
		if (typeof property.default === 'number') return property.default;
		if (typeof property.default === 'boolean') return property.default;
		return 'test-value';
	}

	if (typeof property.default !== 'undefined') {
		const alternative = options.find((option) => option !== property.default);
		return alternative ?? options[0];
	}

	return options[0];
};

const buildStringValue = (name: string): string => {
	const lowerName = name.toLowerCase();
	if (lowerName.includes('email')) return 'user@example.com';
	if (lowerName.includes('url')) return 'https://example.com/resource';
	if (lowerName.includes('timezone')) return 'Europe/Bucharest';
	if (lowerName.includes('ids')) return 'id-1, id-2';
	if (lowerName.includes('id')) return 'id-123';
	if (lowerName.includes('hostname')) return 'host.local';
	if (lowerName.includes('name')) return 'Test Name';
	if (lowerName.includes('ip')) return '192.168.0.1';
	return 'test-value';
};

const buildNumberValue = (property: INodeProperties): number => {
	if (typeof property.default === 'number' && property.default !== 0 && property.default !== -1) {
		return property.default;
	}
	return 1;
};

const buildJsonValue = (property: INodeProperties): string => {
	if (typeof property.default === 'string' && property.default.trim().length > 0) {
		return property.default;
	}
	return '{"value":"test"}';
};

const buildCollectionValue = (property: INodeProperties): IDataObject | IDataObject[] => {
	const multipleValues = property.typeOptions?.multipleValues === true;
	if (!Array.isArray(property.options)) {
		return multipleValues ? [] : {};
	}

	const entry = property.options.reduce<IDataObject>((acc, option) => {
		if (typeof option !== 'object' || option === null || !('type' in option)) {
			return acc;
		}
		const nestedProperty = option;
		acc[nestedProperty.name] = buildParameterValue(nestedProperty);
		return acc;
	}, {});
	return multipleValues ? [entry] : entry;
};

const buildFixedCollectionValue = (property: INodeProperties): IDataObject => {
	if (!Array.isArray(property.options)) {
		return {};
	}

	const multipleValues = property.typeOptions?.multipleValues === true;
	return property.options.reduce<IDataObject>((acc, option) => {
		if (typeof option !== 'object' || option === null || !('values' in option)) {
			return acc;
		}
		const collection = option;
		const entry = collection.values.reduce<IDataObject>((entryAcc, entryOption) => {
			entryAcc[entryOption.name] = buildParameterValue(entryOption);
			return entryAcc;
		}, {});
		acc[collection.name] = multipleValues ? [entry] : entry;
		return acc;
	}, {});
};

const buildParameterValue = (property: INodeProperties): ParameterValue => {
	switch (property.type) {
		case 'string':
			return buildStringValue(property.name);
		case 'dateTime':
			return '2024-01-01T00:00:00.000Z';
		case 'number':
			return buildNumberValue(property);
		case 'boolean':
			return true;
		case 'options':
			return pickOptionValue(property);
		case 'multiOptions':
			return [pickOptionValue(property)];
		case 'json':
			return buildJsonValue(property);
		case 'collection':
			return buildCollectionValue(property);
		case 'fixedCollection':
			return buildFixedCollectionValue(property);
		default:
			if (typeof property.default === 'string') return property.default;
			if (typeof property.default === 'number') return property.default;
			if (typeof property.default === 'boolean') return property.default;
			return 'test-value';
	}
};

const buildParameterMap = (
	description: INodeProperties[],
): Record<string, NodeParameterValueType | object> =>
	description.reduce<Record<string, NodeParameterValueType | object>>((acc, property) => {
		acc[property.name] = buildParameterValue(property);
		return acc;
	}, {});

const isOperationModule = (value: unknown): value is OperationModule => {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const candidate = value as { execute?: unknown; description?: unknown };
	return typeof candidate.execute === 'function' && Array.isArray(candidate.description);
};

export const createMockExecuteFunctions = (): jest.Mocked<IExecuteFunctions> => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	mockExecuteFunctions.getNode.mockReturnValue(mockNode);
	(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
		mockConstructExecutionMetaData,
	);
	return mockExecuteFunctions;
};

export const getOperationEntries = (moduleExports: Record<string, unknown>) =>
	Object.entries(moduleExports)
		.filter(([, value]) => isOperationModule(value))
		.map(([name, value]) => ({ name, module: value as OperationModule }));

export const runOperationTest = async (
	operationName: string,
	operation: OperationModule,
	mockExecuteFunctions: jest.Mocked<IExecuteFunctions>,
	gravityZoneApiRequestMock: jest.MockedFunction<GravityZoneApiRequest>,
) => {
	const params = buildParameterMap(operation.description);
	mockExecuteFunctions.getNodeParameter.mockImplementation(
		(paramName: string, _itemIndex: number, defaultValue?: unknown) => {
			if (Object.prototype.hasOwnProperty.call(params, paramName)) {
				return params[paramName];
			}
			return defaultValue as NodeParameterValueType | object | undefined;
		},
	);

	const apiResult: IDataObject = { ok: true };
	gravityZoneApiRequestMock.mockResolvedValue(apiResult);

	const result = await operation.execute.call(mockExecuteFunctions, 0);

	expect(gravityZoneApiRequestMock).toHaveBeenCalledTimes(1);
	const callArgs = gravityZoneApiRequestMock.mock.calls[0];
	expect(callArgs?.[1]).toBe(operationName);
	expect(result).toEqual([
		{
			json: apiResult,
			pairedItem: { item: 0 },
		},
	]);
};
