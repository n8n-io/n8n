import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	IPageProjectService,
	ProjectPage,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	CONTENT_FIELD,
	PAGE_ID_FIELD,
	PAGE_OPERATIONS,
	SECTION_FIELD,
	type PageOperation,
} from './fields';

function isPageOperation(value: unknown): value is PageOperation {
	return PAGE_OPERATIONS.some((operation) => operation === value);
}

/** @throws {NodeOperationError} when the page module is disabled */
export async function getPageProxy(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<IPageProjectService> {
	if (ctx.helpers.getPageProxy !== undefined) {
		return await ctx.helpers.getPageProxy();
	}
	throw new NodeOperationError(
		ctx.getNode(),
		'Attempted to use Page node but the module is disabled',
	);
}

/** @throws {NodeOperationError} when the node holds an operation that it does not know */
export function getPageOperation(ctx: IExecuteFunctions): PageOperation {
	const operation = ctx.getNodeParameter('operation', 0);
	if (isPageOperation(operation)) {
		return operation;
	}
	throw new NodeOperationError(ctx.getNode(), 'The operation is not supported');
}

function getPageId(ctx: IExecuteFunctions, itemIndex: number): string {
	return String(ctx.getNodeParameter(PAGE_ID_FIELD, itemIndex, undefined, { extractValue: true }));
}

function getContent(ctx: IExecuteFunctions, itemIndex: number): string {
	return String(ctx.getNodeParameter(CONTENT_FIELD, itemIndex, ''));
}

function getSectionTitle(ctx: IExecuteFunctions, itemIndex: number): string {
	return String(ctx.getNodeParameter(SECTION_FIELD, itemIndex, ''));
}

function toWriteResult({ id, title, version, url }: ProjectPage): IDataObject {
	return { id, title, version, url };
}

function toReadResult({ id, title, content, version, updatedAt }: ProjectPage): IDataObject {
	return { id, title, content, version, updatedAt };
}

type OperationRunner = (
	ctx: IExecuteFunctions,
	proxy: IPageProjectService,
	itemIndex: number,
) => Promise<IDataObject>;

const operationRunners: Record<PageOperation, OperationRunner> = {
	append: async (ctx, proxy, itemIndex) =>
		toWriteResult(await proxy.appendToPage(getPageId(ctx, itemIndex), getContent(ctx, itemIndex))),
	get: async (ctx, proxy, itemIndex) =>
		toReadResult(await proxy.getPage(getPageId(ctx, itemIndex))),
	updateSection: async (ctx, proxy, itemIndex) =>
		toWriteResult(
			await proxy.updatePageSection(
				getPageId(ctx, itemIndex),
				getSectionTitle(ctx, itemIndex),
				getContent(ctx, itemIndex),
			),
		),
	replace: async (ctx, proxy, itemIndex) =>
		toWriteResult(
			await proxy.replacePageContent(getPageId(ctx, itemIndex), getContent(ctx, itemIndex)),
		),
};

/** Runs the operation for one input item and returns the output of that item. */
export async function runPageOperation(
	ctx: IExecuteFunctions,
	proxy: IPageProjectService,
	operation: PageOperation,
	itemIndex: number,
): Promise<IDataObject> {
	return await operationRunners[operation](ctx, proxy, itemIndex);
}

/** Lists the pages of the project of the workflow. `filter` keeps the titles that contain it. */
export async function pageSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const proxy = await getPageProxy(this);
	const pages = await proxy.listPages({ titleQuery: filter });
	return { results: pages.map(({ id, title, url }) => ({ name: title, value: id, url })) };
}
