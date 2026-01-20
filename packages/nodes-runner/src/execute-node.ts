import type { IExecuteFunctions, INodeType, VersionedNodeType } from 'n8n-workflow';

type ExecuteForSure = Exclude<INodeType['execute'], undefined>;

type ExecuteNodeParams = {
	packageName: string;
	executeFunction: IExecuteFunctions;
	nodeVersion?: number;
};

type NodeType = INodeType | VersionedNodeType;
type NodeClass =
	| {
			new (): NodeType;
	  }
	| undefined;

const getExecuteFunction = (nodeClass: NodeClass, nodeVersion?: number): ExecuteForSure => {
	let actualNode: INodeType | undefined;
	if (nodeClass) {
		const node: NodeType = new nodeClass();
		if (Object.hasOwn(node as Object, 'getNodeType')) {
			if (nodeVersion) {
				actualNode = (node as VersionedNodeType).getNodeType(nodeVersion);
			} else {
				throw new Error('Versioned node detected but no version was provided');
			}
		} else {
			actualNode = node as INodeType;
		}
		if (actualNode && !Object.hasOwn(actualNode, 'execute')) {
			return actualNode.execute as ExecuteForSure;
		}
	}

	throw new Error('execute() method not found');
};

const executeNode = async ({ packageName, executeFunction, nodeVersion }: ExecuteNodeParams) => {
	const node: NodeClass = (
		await import(`n8n-nodes-base/dist/nodes/${packageName}/${packageName}.node.js`)
	)?.[packageName];
	const execute = getExecuteFunction(node, nodeVersion);

	return execute.call(executeFunction);
};

export default executeNode;
