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
		const pinData = getPinDataIfManualExecution(workflow, nodeCause, mode);
		const message = pinData
			? `Using the ${usedMethodName} method doesn't work with pinned data in this scenario. Please unpin '${nodeCause}' and try again.`
			: `Paired item data for ${usedMethodName} from node '${nodeCause}' is unavailable. Ensure '${nodeCause}' is providing the required output.`;

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

	const createBranchNotFoundError = (node: string, item: number, cause?: string) => {
		return createExpressionError('Branch not found', {
			messageTemplate: 'Paired item references non-existent branch',
			functionality: 'pairedItem',
			nodeCause: cause,
			functionOverrides: { message: 'Invalid branch reference' },
			description: `Item ${item} in node ${node} references a branch that doesn't exist.`,
			type: 'paired_item_invalid_info',
		});
	};

	const createPairedItemNotFound = (destinationNode: string, cause?: string) => {
		return createExpressionError('Paired item resolution failed', {
			messageTemplate: 'Unable to find paired item source',
			functionality: 'pairedItem',
			nodeCause: cause,
			functionOverrides: { message: 'Data not found' },
			description: `Could not trace back to node '${destinationNode}'`,
			type: 'paired_item_no_info',
			moreInfoLink: true,
		});
	};

	const createPairedItemMultipleItemsError = (destinationNode: string, index: number) => {
		return createExpressionError('Multiple matches found', {
			messageTemplate: `Multiple matching items for item [${index}]`,
			functionality: 'pairedItem',
			functionOverrides: { message: 'Multiple matches' },
			nodeCause: destinationNode,
			descriptionKey: isScriptingNode(destinationNode, workflow)
				? 'pairedItemMultipleMatchesCodeNode'
				: 'pairedItemMultipleMatches',
			type: 'paired_item_multiple_matches',
		});
	};

	const createPairedItemIntermediateNodesError = (nodeName: string) => {
		return createExpressionError('Can’t get data for expression', {
			messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
			functionality: 'pairedItem',
			functionOverrides: {
				description: `Some intermediate nodes between ‘<strong>${nodeName}</strong>‘ and  ‘<strong>${activeNodeName}</strong>‘ have not executed yet.`,
				message: 'Can’t get data',
			},
			description: `Some intermediate nodes between ‘<strong>${nodeName}</strong>‘ and  ‘<strong>${activeNodeName}</strong>‘ have not executed yet.`,
			causeDetailed: `pairedItem can\'t be found when intermediate nodes between ‘<strong>${nodeName}</strong>‘ and  ‘<strong>${activeNodeName}</strong> have not executed yet.`,
			itemIndex,
			type: 'paired_item_intermediate_nodes',
		});
	};

	const createMissingSourceDataError = () => {
		return createExpressionError('Can’t get data for expression', {
			messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
			functionality: 'pairedItem',
			functionOverrides: {
				message: 'Can’t get data',
			},
			description: 'Apologies, this is an internal error. See details for more information',
			causeDetailed: 'Missing sourceData (probably an internal error)',
			itemIndex,
		});
	};

	return {
		createExpressionError,
		createInvalidPairedItemError,
		createMissingPairedItemError,
		createPairedItemNotFound,
		createPairedItemMultipleItemsError,
		createPairedItemIntermediateNodesError,
		createNoConnectionError,
		createBranchNotFoundError,
		createMissingSourceDataError,
	};
}
