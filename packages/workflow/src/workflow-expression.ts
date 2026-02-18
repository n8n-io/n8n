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

		// Early return for simple non-expression values (performance optimization + timezone correctness)
		if (!isComplexParameter(parameterValue) && !isExpression(parameterValue)) {
			return parameterValue;
		}

		// Handle arrays - recursively resolve each element
		if (Array.isArray(parameterValue)) {
			return parameterValue.map((item) =>
				this.getParameterValue(
					item as NodeParameterValueType,
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
				),
			) as NodeParameterValue[] | INodeParameters[];
		}

		// Handle null/undefined
		if (parameterValue === null || parameterValue === undefined) {
			return parameterValue;
		}

		// Handle non-array objects - recursively resolve each property
		if (typeof parameterValue === 'object') {
			const returnData: INodeParameters = {};
			for (const [key, value] of Object.entries(parameterValue)) {
				const typedValue = value as NodeParameterValueType;
				if (typeof typedValue === 'object') {
					// Complex value - recurse without siblings
					returnData[key] = this.getParameterValue(
						typedValue,
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
				} else {
					// Simple value - pass parent object as siblingParameters so
					// $parameter["&sibling"] expressions can resolve correctly
					returnData[key] = this.resolveSimpleParameterValue(
						typedValue as NodeParameterValue,
						parameterValue as INodeParameters,
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
			}

			if (returnObjectAsString && typeof returnData === 'object') {
				return this.expression.convertObjectValueToString(returnData);
			}

			return returnData;
		}

		// Simple expression value - create WorkflowDataProxy and delegate to Expression
		const dataProxy = new WorkflowDataProxy(
			this.workflow,
			runExecutionData,
			runIndex,
			itemIndex,
			activeNodeName,
			connectionInputData,
			{},
			mode,
			additionalKeys,
			executeData,
			-1,
			selfData,
			contextNodeName,
		);
		const data = dataProxy.getDataProxy();

		return this.expression.resolveSimpleParameterValue(
			parameterValue as NodeParameterValue,
			data,
			returnObjectAsString,
		);
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
