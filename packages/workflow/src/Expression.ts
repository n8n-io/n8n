
import {
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	NodeParameterValue,
	Workflow,
	WorkflowDataProxy,
	WorkflowExecuteMode,
} from './';

// @ts-ignore
import * as tmpl from 'riot-tmpl';

// Set it to use double curly brackets instead of single ones
tmpl.brackets.set('{{ }}');

// Make sure that it does not always print an error when it could not resolve
// a variable
tmpl.tmpl.errorHandler = () => { };


export class Expression {

	workflow: Workflow;

	constructor(workflow: Workflow) {
		this.workflow = workflow;
	}


	/**
	 * Converts an object to a string in a way to make it clear that
	 * the value comes from an object
	 *
	 * @param {object} value
	 * @returns {string}
	 * @memberof Workflow
	 */
	convertObjectValueToString(value: object): string {
		const typeName = Array.isArray(value) ? 'Array' : 'Object';
		return `[${typeName}: ${JSON.stringify(value)}]`;
	}



	/**
	 * Resolves the paramter value.  If it is an expression it will execute it and
	 * return the result. For everything simply the supplied value will be returned.
	 *
	 * @param {NodeParameterValue} parameterValue
	 * @param {(IRunExecutionData | null)} runExecutionData
	 * @param {number} runIndex
	 * @param {number} itemIndex
	 * @param {string} activeNodeName
	 * @param {INodeExecutionData[]} connectionInputData
	 * @param {boolean} [returnObjectAsString=false]
	 * @returns {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[])}
	 * @memberof Workflow
	 */
	resolveSimpleParameterValue(parameterValue: NodeParameterValue, siblingParameters: INodeParameters, runExecutionData: IRunExecutionData | null, runIndex: number, itemIndex: number, activeNodeName: string, connectionInputData: INodeExecutionData[], mode: WorkflowExecuteMode, returnObjectAsString = false, selfData = {}): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] {
		// Check if it is an expression
		if (typeof parameterValue !== 'string' || parameterValue.charAt(0) !== '=') {
			// Is no expression so return value
			return parameterValue;
		}

		// Is an expression

		// Remove the equal sign
		parameterValue = parameterValue.substr(1);

		// Generate a data proxy which allows to query workflow data
		const dataProxy = new WorkflowDataProxy(this.workflow, runExecutionData, runIndex, itemIndex, activeNodeName, connectionInputData, siblingParameters, mode, -1, selfData);
		const data = dataProxy.getDataProxy();

		// Execute the expression
		try {
			const returnValue = tmpl.tmpl(parameterValue, data);
			if (typeof returnValue === 'function') {
				throw new Error('Expression resolved to a function. Please add "()"');
			} else if (returnValue !== null && typeof returnValue === 'object') {
				if (returnObjectAsString === true) {
					return this.convertObjectValueToString(returnValue);
				}
			}
			return returnValue;
		} catch (e) {
			throw new Error(`Expression is not valid: ${e.message}`);
		}
	}



	/**
	 * Resolves value of parameter. But does not work for workflow-data.
	 *
	 * @param {INode} node
	 * @param {(string | undefined)} parameterValue
	 * @param {string} [defaultValue]
	 * @returns {(string | undefined)}
	 * @memberof Workflow
	 */
	getSimpleParameterValue(node: INode, parameterValue: string | boolean | undefined, mode: WorkflowExecuteMode, defaultValue?: boolean | number | string): boolean | number | string | undefined {
		if (parameterValue === undefined) {
			// Value is not set so return the default
			return defaultValue;
		}

		// Get the value of the node (can be an expression)
		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
		};

		return this.getParameterValue(parameterValue, runData, runIndex, itemIndex, node.name, connectionInputData, mode) as boolean | number | string | undefined;
	}



	/**
	 * Resolves value of complex parameter. But does not work for workflow-data.
	 *
	 * @param {INode} node
	 * @param {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[])} parameterValue
	 * @param {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | undefined)} [defaultValue]
	 * @returns {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | undefined)}
	 * @memberof Workflow
	 */
	getComplexParameterValue(node: INode, parameterValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[], mode: WorkflowExecuteMode, defaultValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | undefined = undefined, selfData = {}): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | undefined {
		if (parameterValue === undefined) {
			// Value is not set so return the default
			return defaultValue;
		}

		// Get the value of the node (can be an expression)
		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
		};

		// Resolve the "outer" main values
		const returnData = this.getParameterValue(parameterValue, runData, runIndex, itemIndex, node.name, connectionInputData, mode, false, selfData);

		// Resolve the "inner" values
		return this.getParameterValue(returnData, runData, runIndex, itemIndex, node.name, connectionInputData, mode, false, selfData);
	}



	/**
	 * Returns the resolved node parameter value. If it is an expression it will execute it and
	 * return the result. If the value to resolve is an array or object it will do the same
	 * for all of the items and values.
	 *
	 * @param {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[])} parameterValue
	 * @param {(IRunExecutionData | null)} runExecutionData
	 * @param {number} runIndex
	 * @param {number} itemIndex
	 * @param {string} activeNodeName
	 * @param {INodeExecutionData[]} connectionInputData
	 * @param {boolean} [returnObjectAsString=false]
	 * @returns {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[])}
	 * @memberof Workflow
	 */
	getParameterValue(parameterValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[], runExecutionData: IRunExecutionData | null, runIndex: number, itemIndex: number, activeNodeName: string, connectionInputData: INodeExecutionData[], mode: WorkflowExecuteMode, returnObjectAsString = false, selfData = {}): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] {
		// Helper function which returns true when the parameter is a complex one or array
		const isComplexParameter = (value: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[]) => {
			return typeof value === 'object';
		};

		// Helper function which resolves a parameter value depending on if it is simply or not
		const resolveParameterValue = (value: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[], siblingParameters: INodeParameters) => {
			if (isComplexParameter(value)) {
				return this.getParameterValue(value, runExecutionData, runIndex, itemIndex, activeNodeName, connectionInputData, mode, returnObjectAsString, selfData);
			} else {
				return this.resolveSimpleParameterValue(value as NodeParameterValue, siblingParameters, runExecutionData, runIndex, itemIndex, activeNodeName, connectionInputData, mode, returnObjectAsString, selfData);
			}
		};

		// Check if it value is a simple one that we can get it resolved directly
		if (!isComplexParameter(parameterValue)) {
			return this.resolveSimpleParameterValue(parameterValue as NodeParameterValue, {}, runExecutionData, runIndex, itemIndex, activeNodeName, connectionInputData, mode, returnObjectAsString, selfData);
		}

		// The parameter value is complex so resolve depending on type

		if (Array.isArray(parameterValue)) {
			// Data is an array
			const returnData = [];
			for (const item of parameterValue) {
				returnData.push(resolveParameterValue(item, {}));
			}

			if (returnObjectAsString === true && typeof returnData === 'object') {
				return this.convertObjectValueToString(returnData);
			}

			return returnData as NodeParameterValue[] | INodeParameters[];
		} else if (parameterValue === null || parameterValue === undefined) {
			return parameterValue;
		} else {
			// Data is an object
			const returnData: INodeParameters = {};
			for (const key of Object.keys(parameterValue)) {
				returnData[key] = resolveParameterValue((parameterValue as INodeParameters)[key], parameterValue as INodeParameters);
			}

			if (returnObjectAsString === true && typeof returnData === 'object') {
				return this.convertObjectValueToString(returnData);
			}
			return returnData;
		}
	}
}
