import type { Tool } from '@langchain/core/tools';
import type { IExecuteFunctions, IWebhookFunctions } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { N8nTool } from './N8nTool';

export function escapeSingleCurlyBrackets(text?: string): string | undefined {
	if (text === undefined) return undefined;

	let result = text;

	result = result
		// First handle triple brackets to avoid interference with double brackets
		.replace(/(?<!{){{{(?!{)/g, '{{{{')
		.replace(/(?<!})}}}(?!})/g, '}}}}')
		// Then handle single brackets, but only if they're not part of double brackets
		// Convert single { to {{ if it's not already part of {{ or {{{
		.replace(/(?<!{){(?!{)/g, '{{')
		// Convert single } to }} if it's not already part of }} or }}}
		.replace(/(?<!})}(?!})/g, '}}');

	return result;
}

export const getConnectedTools = async (
	ctx: IExecuteFunctions | IWebhookFunctions,
	enforceUniqueNames: boolean,
	convertStructuredTool: boolean = true,
	escapeCurlyBrackets: boolean = false,
) => {
	const connectedTools =
		((await ctx.getInputConnectionData(NodeConnectionTypes.AiTool, 0)) as Tool[]) || [];

	if (!enforceUniqueNames) return connectedTools;

	const seenNames = new Set<string>();

	const finalTools = [];

	for (const tool of connectedTools) {
		const { name } = tool;
		if (seenNames.has(name)) {
			throw new NodeOperationError(
				ctx.getNode(),
				`You have multiple tools with the same name: '${name}', please rename them to avoid conflicts`,
			);
		}
		seenNames.add(name);

		if (escapeCurlyBrackets) {
			tool.description = escapeSingleCurlyBrackets(tool.description) ?? tool.description;
		}

		if (convertStructuredTool && tool instanceof N8nTool) {
			finalTools.push(tool.asDynamicTool());
		} else {
			finalTools.push(tool);
		}
	}

	return finalTools;
};
