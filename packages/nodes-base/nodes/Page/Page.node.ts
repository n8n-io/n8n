import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPageProjectService,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { pageProperties, type PageOperation } from './fields';
import { getPageOperation, getPageProxy, pageSearch, runPageOperation } from './operations';

function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

/**
 * Runs the operation for one item.
 * A failure becomes an error item when the node continues on fail.
 * @throws {NodeOperationError} when the operation fails and the node does not continue on fail
 */
async function executeItem(
	ctx: IExecuteFunctions,
	proxy: IPageProjectService,
	operation: PageOperation,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const json = await runPageOperation(ctx, proxy, operation, itemIndex);
		return ctx.helpers.constructExecutionMetaData([{ json }], { itemData: { item: itemIndex } });
	} catch (error) {
		if (ctx.continueOnFail()) {
			return [{ json: { error: toError(error).message }, pairedItem: { item: itemIndex } }];
		}
		throw new NodeOperationError(ctx.getNode(), toError(error), { itemIndex });
	}
}

export class Page implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Page',
		name: 'page',
		icon: 'file:page.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Read and write the pages of the project',
		defaults: {
			name: 'Page',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: pageProperties,
	};

	methods = {
		listSearch: {
			pageSearch,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const proxy = await getPageProxy(this);
		const operation = getPageOperation(this);
		const results: INodeExecutionData[][] = [];

		// One item after the other, so that appends reach the page in the order of the items.
		for (const itemIndex of this.getInputData().keys()) {
			results.push(await executeItem(this, proxy, operation, itemIndex));
		}

		return [results.flat()];
	}
}
