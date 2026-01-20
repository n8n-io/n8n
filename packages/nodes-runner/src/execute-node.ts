import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	VersionedNodeType,
} from 'n8n-workflow';

type ExecuteNode = (params: {
	packageName: string;
	executeFunction: IExecuteFunctions;
	nodeVersion?: number;
}) => Promise<INodeExecutionData[][]>;

const getExecuteFunction = (
	node: INodeType | VersionedNodeType | undefined,
	nodeVersion?: number,
): INodeType['execute'] => {
	let actualNode: INodeType | undefined;
	if (Object.hasOwn(node, 'getNodeType')) {
		if (nodeVersion) {
			actualNode = (node as VersionedNodeType).getNodeType(nodeVersion);
		} else {
			throw new Error('Versioned node detected but no version was provided');
		}
	} else {
		actualNode = node as INodeType;
	}
	if (actualNode && !Object.hasOwn(actualNode, 'execute')) {
		return actualNode.execute;
	}

	throw new Error('execute() method not found');
};

const executeNode: ExecuteNode = async ({ packageName, executeFunction, nodeVersion }) => {
	try {
		const node: INodeType | VersionedNodeType = await import(`n8n-nodes-base/${packageName}`);
		const execute = getExecuteFunction(node, nodeVersion);

		return execute.call(executeFunction);
	} catch (e) {
		console.error('Massive error occurred', e.message, e.stack);
	}
};
