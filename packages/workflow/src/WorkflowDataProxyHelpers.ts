import type { INodeExecutionData, Workflow, WorkflowExecuteMode } from '.';
import { SCRIPTING_NODE_TYPES } from './Constants';
import { ExpressionError, type ExpressionErrorOptions } from './errors/expression.error';

export function getPinDataIfManualExecution(
	workflow: Workflow,
	nodeName: string,
	mode: WorkflowExecuteMode,
): INodeExecutionData[] | undefined {
	if (mode !== 'manual') {
		return undefined;
	}
	return workflow.getPinDataOfNode(nodeName);
}

export const isScriptingNode = (nodeName: string, workflow: Workflow) => {
	const node = workflow.getNode(nodeName);

	return node && SCRIPTING_NODE_TYPES.includes(node.type);
};

export interface CreateErrorContext {
	readonly workflow: Workflow;
	readonly mode: WorkflowExecuteMode;
	readonly runIndex: number;
	readonly itemIndex: number;
	readonly activeNodeName: string;
}

export function createErrorUtils(context: CreateErrorContext) {
	const { workflow, mode, runIndex, itemIndex, activeNodeName } = context;

	const createExpressionError = (
		message: string,
		options?: ExpressionErrorOptions & {
			moreInfoLink?: boolean;
			functionOverrides?: {
				// Custom data to display for Function-Nodes
				message?: string;
				description?: string;
			};
		},
	) => {
		if (isScriptingNode(activeNodeName, workflow) && options?.functionOverrides) {
			// If the node in which the error is thrown is a function node,
			// display a different error message in case there is one defined
			message = options.functionOverrides.message ?? message;
			options.description = options.functionOverrides.description ?? options.description;
			// The error will be in the code and not on an expression on a parameter
			// so remove the messageTemplate as it would overwrite the message
			options.messageTemplate = undefined;
		}

		if (options?.nodeCause) {
			const nodeName = options.nodeCause;
			const pinData = getPinDataIfManualExecution(workflow, nodeName, mode);

			if (pinData) {
				if (!options) {
					options = {};
				}
				message = `Unpin '${nodeName}' to execute`;
				options.messageTemplate = undefined;
				options.descriptionKey = 'pairedItemPinned';
			}

			if (options.moreInfoLink && (pinData ?? isScriptingNode(nodeName, workflow))) {
				const moreInfoLink =
					' <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-errors/">More info</a>';

				options.description += moreInfoLink;
				if (options.descriptionTemplate) options.descriptionTemplate += moreInfoLink;
			}
		}

		return new ExpressionError(message, {
			runIndex,
			itemIndex,
			...options,
		});
	};

	const createInvalidPairedItemError = ({ nodeName }: { nodeName: string }) => {
		return createExpressionError("Can't get data for expression", {
			messageTemplate: 'Expression info invalid',
			functionality: 'pairedItem',
			functionOverrides: {
				message: "Can't get data",
			},
			nodeCause: nodeName,
			descriptionKey: 'pairedItemInvalidInfo',
			type: 'paired_item_invalid_info',
		});
	};

	const createMissingPairedItemError = (
		nodeCause: string,
		usedMethodName: 'itemMatching' | 'pairedItem' | 'item' | '$getPairedItem' = 'pairedItem',
	) => {
		const message = `Using the ${usedMethodName} method doesn't work with pinned data in this scenario. Please unpin '${nodeCause}' and try again.`;
		return new ExpressionError(message, {
			runIndex,
			itemIndex,
			functionality: 'pairedItem',
			descriptionKey: isScriptingNode(nodeCause, workflow)
				? 'pairedItemNoInfoCodeNode'
				: 'pairedItemNoInfo',
			nodeCause,
			causeDetailed: `Missing pairedItem data (node '${nodeCause}' probably didn't supply it)`,
			type: 'paired_item_no_info',
		});
	};

	const createNoConnectionError = (nodeCause: string) => {
		return createExpressionError('Invalid expression', {
			messageTemplate: 'No path back to referenced node',
			functionality: 'pairedItem',
			descriptionKey: isScriptingNode(nodeCause, workflow)
				? 'pairedItemNoConnectionCodeNode'
				: 'pairedItemNoConnection',
			type: 'paired_item_no_connection',
			moreInfoLink: true,
			nodeCause,
		});
	};

	return {
		createExpressionError,
		createInvalidPairedItemError,
		createMissingPairedItemError,
		createNoConnectionError,
	};
}
