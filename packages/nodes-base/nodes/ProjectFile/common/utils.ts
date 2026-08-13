import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	IProjectFileService,
	ProjectFileRef,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * The helper is absent when the project-files module is disabled, so this is the
 * one place that turns that into a legible node error instead of a crash.
 */
export async function getProjectFileProxy(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	node: INode,
): Promise<IProjectFileService> {
	const getProxy = context.helpers.getProjectFileProxy;

	if (getProxy === undefined) {
		throw new NodeOperationError(node, 'Project files are not available on this instance', {
			description:
				'The project-files module is disabled. Remove it from N8N_DISABLED_MODULES to use this node.',
		});
	}

	return await getProxy();
}

/**
 * Turns the file selector into a reference.
 *
 * `list` yields an id, since the picker resolves to one; `name` addresses the
 * file by its per-project unique name, which is what a workflow usually knows.
 */
export function toFileRef(this: IExecuteFunctions, itemIndex: number): ProjectFileRef {
	const locator = this.getNodeParameter('file', itemIndex) as {
		mode: 'list' | 'name' | 'id';
		value: string;
	};

	if (locator.mode === 'name') {
		return { by: 'name', name: locator.value };
	}

	return { by: 'id', id: locator.value };
}
