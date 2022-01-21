import {
	INodeType,
	INodeTypeData,
	INodeTypes,
	NodeHelpers,
} from '../src';

export interface INodeTypesObject {
	[key: string]: INodeType;
}

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {
		'test.set': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Set',
					name: 'set',
					group: ['input'],
					version: 1,
					description: 'Sets a value',
					defaults: {
						name: 'Set',
						color: '#0000FF',
					},
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Value1',
							name: 'value1',
							type: 'string',
							default: 'default-value1',
						},
						{
							displayName: 'Value2',
							name: 'value2',
							type: 'string',
							default: 'default-value2',
						},
					],
				},
			},
		},
		'test.setMulti': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Set Multi',
					name: 'setMulti',
					group: ['input'],
					version: 1,
					description: 'Sets multiple values',
					defaults: {
						name: 'Set Multi',
						color: '#0000FF',
					},
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Values',
							name: 'values',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: true,
							},
							default: {},
							options: [
								{
									name: 'string',
									displayName: 'String',
									values: [
										{
											displayName: 'Name',
											name: 'name',
											type: 'string',
											default: 'propertyName',
											placeholder: 'Name of the property to write data to.',
										},
										{
											displayName: 'Value',
											name: 'value',
											type: 'string',
											default: '',
											placeholder: 'The string value to write in the property.',
										},
									],
								},
							],
						},
					],
				},
			},
		},
	};

	async init(nodeTypes: INodeTypeData): Promise<void> {}

	getAll(): INodeType[] {
		return Object.values(this.nodeTypes).map((data) => NodeHelpers.getVersionedNodeType(data.type));
	}

	getByName(nodeType: string): INodeType {
		return this.getByNameAndVersion(nodeType);
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType].type, version);
	}
}

let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
