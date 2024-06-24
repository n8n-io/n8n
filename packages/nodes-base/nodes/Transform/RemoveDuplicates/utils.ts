import get from 'lodash/get';
import { NodeOperationError, type INode, type INodeExecutionData } from 'n8n-workflow';

export const validateInputData = (
	node: INode,
	items: INodeExecutionData[],
	keysToCompare: string[],
	disableDotNotation: boolean,
) => {
	for (const key of keysToCompare) {
		let type: any = undefined;
		for (const [i, item] of items.entries()) {
			if (key === '') {
				throw new NodeOperationError(node, 'Name of field to compare is blank');
			}
			const value = !disableDotNotation ? get(item.json, key) : item.json[key];
			if (value === null && node.typeVersion > 1) continue;

			if (value === undefined && disableDotNotation && key.includes('.')) {
				throw new NodeOperationError(node, `'${key}' field is missing from some input items`, {
					description:
						"If you're trying to use a nested field, make sure you turn off 'disable dot notation' in the node options",
				});
			} else if (value === undefined) {
				throw new NodeOperationError(node, `'${key}' field is missing from some input items`);
			}
			if (type !== undefined && value !== undefined && type !== typeof value) {
				const description =
					'The type of this field varies between items' +
					(node.typeVersion > 1
						? `, in item [${i - 1}] it's a ${type} and in item [${i}] it's a ${typeof value} `
						: '');
				throw new NodeOperationError(node, `'${key}' isn't always the same type`, {
					description,
				});
			} else {
				type = typeof value;
			}
		}
	}
};
