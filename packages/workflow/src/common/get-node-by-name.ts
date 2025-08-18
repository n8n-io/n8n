import type { INode, INodes } from '../interfaces';

/**
 * Returns the node with the given name if it exists else null
 *
 * @param {INodes} nodes Nodes to search in
 * @param {string} name Name of the node to return
 */
export function getNodeByName(nodes: INodes | INode[], name: string) {
	if (Array.isArray(nodes)) {
		return nodes.find((node) => node.name === name) || null;
	}

	if (nodes.hasOwnProperty(name)) {
		return nodes[name];
	}

	return null;
}
