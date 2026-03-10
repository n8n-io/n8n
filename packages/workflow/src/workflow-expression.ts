import { Expression } from './expression';
import { isExpression } from './expressions/expression-helpers';
import type {
	IExecuteData,
	INode,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodeParameters,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValue,
	NodeParameterValueType,
	WorkflowExecuteMode,
} from './interfaces';
import type { IRunExecutionData } from './run-execution-data/run-execution-data';
import { createEmptyRunExecutionData } from './run-execution-data-factory';
import type { Workflow } from './workflow';
import { WorkflowDataProxy } from './workflow-data-proxy';

export class WorkflowExpression {
	private readonly expression: Expression;

	constructor(private readonly workflow: Workflow) {
		this.expression = new Expression(workflow.timezone);
	}

	/**
	 * Resolves the parameter value.  If it is an expression it will execute it and
	 * return the result. For everything simply the supplied value will be returned.
	 */
	resolveSimpleParameterValue(
		parameterValue: NodeParameterValue,
		siblingParameters: INodeParameters,
		runExecutionData: IRunExecutionData | null,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		returnObjectAsString = false,
		selfData = {},
		contextNodeName?: string,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] {
		if (!isExpression(parameterValue)) {
			return parameterValue;
		}

		const dataProxy = new WorkflowDataProxy(
			this.workflow,
			runExecutionData,
			runIndex,
			itemIndex,
			activeNodeName,
			connectionInputData,
			siblingParameters,
			mode,
			additionalKeys,
			executeData,
			-1,
			selfData,
			contextNodeName,
		);
		const data = dataProxy.getDataProxy();

		return this.expression.resolveSimpleParameterValue(parameterValue, data, returnObjectAsString);
	}

	/**
	 * Returns the resolved node parameter value. If it is an expression it will execute it and
	 * return the result. If the value to resolve is an array or object it will do the same
	 * for all of the items and values.
	 */
	getParameterValue(
		parameterValue: NodeParameterValueType | INodeParameterResourceLocator,
		runExecutionData: IRunExecutionData | null,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		returnObjectAsString = false,
		selfData = {},
		contextNodeName?: string,
	): NodeParameterValueType {
		// Helper function which returns true when the parameter is a complex one or array
		const isComplexParameter = (value: NodeParameterValueType) => {
			return typeof value === 'object';
		};

		// Helper function which resolves a parameter value depending on if it is simply or not
		const resolveParameterValue = (
			value: NodeParameterValueType,
			siblingParameters: INodeParameters,
		) => {
			if (isComplexParameter(value)) {
				return this.getParameterValue(
					value,
					runExecutionData,
					runIndex,
					itemIndex,
					activeNodeName,
					connectionInputData,
					mode,
					additionalKeys,
					executeData,
					returnObjectAsString,
					selfData,
					contextNodeName,
				);
			}

			return this.resolveSimpleParameterValue(
				value as NodeParameterValue,
				siblingParameters,
				runExecutionData,
				runIndex,
				itemIndex,
				activeNodeName,
				connectionInputData,
				mode,
				additionalKeys,
				executeData,
				returnObjectAsString,
				selfData,
				contextNodeName,
			);
		};

		// Early return for simple non-expression values (performance optimization + timezone correctness)
		if (!isComplexParameter(parameterValue)) {
			return this.resolveSimpleParameterValue(
				parameterValue as NodeParameterValue,
				{},
				runExecutionData,
				runIndex,
				itemIndex,
				activeNodeName,
				connectionInputData,
				mode,
				additionalKeys,
				executeData,
				returnObjectAsString,
				selfData,
				contextNodeName,
			);
		}

		// Handle arrays - recursively resolve each element
		if (Array.isArray(parameterValue)) {
			// Data is an array
			const returnData = parameterValue.map((item) =>
				resolveParameterValue(item as NodeParameterValueType, {}),
			);
			return returnData as NodeParameterValue[] | INodeParameters[];
		}

		// Handle null/undefined
		if (parameterValue === null || parameterValue === undefined) {
			return parameterValue;
		}

		if (typeof parameterValue !== 'object') {
			return {};
		}

		// Data is an object
		const returnData: INodeParameters = {};

		for (const [key, value] of Object.entries(parameterValue)) {
			returnData[key] = resolveParameterValue(
				value as NodeParameterValueType,
				parameterValue as INodeParameters,
			);
		}

		if (returnObjectAsString && typeof returnData === 'object') {
			return this.convertObjectValueToString(returnData);
		}

		return returnData;
	}

	/**
	 * Resolves value of parameter. But does not work for workflow-data.
	 */
	getSimpleParameterValue(
		node: INode,
		parameterValue: string | boolean | undefined,
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		defaultValue?: boolean | number | string | unknown[],
	): boolean | number | string | undefined | unknown[] {
		if (parameterValue === undefined) {
			return defaultValue;
		}

		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runData = createEmptyRunExecutionData();

		return this.getParameterValue(
			parameterValue,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			additionalKeys,
			executeData,
		) as boolean | number | string | undefined;
	}

	/**
	 * Resolves value of complex parameter. But does not work for workflow-data.
	 */
	getComplexParameterValue(
		node: INode,
		parameterValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		defaultValue: NodeParameterValueType | undefined = undefined,
		selfData = {},
	): NodeParameterValueType | undefined {
		if (parameterValue === undefined) {
			return defaultValue;
		}

		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runData = createEmptyRunExecutionData();

		const returnData = this.getParameterValue(
			parameterValue,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			additionalKeys,
			executeData,
			false,
			selfData,
		);

		return this.getParameterValue(
			returnData,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			additionalKeys,
			executeData,
			false,
			selfData,
		);
	}

	convertObjectValueToString(value: object): string {
		return this.expression.convertObjectValueToString(value);
	}
}
