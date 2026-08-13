import type { IExecuteFunctions, ILoadOptionsFunctions, IProjectFilesService } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { FILE_ID_FIELD } from './fields';

export type FileResourceLocator = { mode: 'list' | 'id' | 'name'; value: string };

export async function getProjectFilesProxy(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<IProjectFilesService> {
	if (ctx.helpers.getProjectFilesProxy === undefined) {
		throw new NodeOperationError(ctx.getNode(), 'File storage is disabled on this instance.');
	}

	return await ctx.helpers.getProjectFilesProxy();
}

export function getFileResourceLocator(ctx: IExecuteFunctions, index: number): FileResourceLocator {
	return ctx.getNodeParameter(FILE_ID_FIELD, index) as FileResourceLocator;
}

/** Resolves the RLC to the target file id (by-name locators hit the name index). */
export async function resolveFileId(
	ctx: IExecuteFunctions,
	proxy: IProjectFilesService,
	index: number,
): Promise<string> {
	const resourceLocator = getFileResourceLocator(ctx, index);

	if (resourceLocator.mode === 'name') {
		const file = await proxy.findByName(resourceLocator.value);
		if (file === null) {
			throw new NodeOperationError(
				ctx.getNode(),
				`File with name "${resourceLocator.value}" not found in this project`,
				{
					description: 'It may have been renamed or deleted. Choose an existing file in the node.',
				},
			);
		}
		return file.id;
	}

	return resourceLocator.value;
}
