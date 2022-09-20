import * as tmpl from '@n8n_io/riot-tmpl';
import { DateTime, Duration, Interval } from 'luxon';

// eslint-disable-next-line import/no-cycle
import {
	ExpressionError,
	IExecuteData,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	NodeParameterValue,
	Workflow,
	WorkflowDataProxy,
	WorkflowExecuteMode,
} from '.';

// Set it to use double curly brackets instead of single ones
tmpl.brackets.set('{{ }}');

// Make sure that error get forwarded
tmpl.tmpl.errorHandler = (error: Error) => {
	if (error instanceof ExpressionError) {
		if (error.context.failExecution) {
			throw error;
		}
	}
};

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
	 * Resolves the parameter value.  If it is an expression it will execute it and
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
	resolveSimpleParameterValue(
		parameterValue: NodeParameterValue,
		siblingParameters: INodeParameters,
		runExecutionData: IRunExecutionData | null,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		mode: WorkflowExecuteMode,
		timezone: string,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		returnObjectAsString = false,
		selfData = {},
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] {
		// Check if it is an expression
		if (typeof parameterValue !== 'string' || parameterValue.charAt(0) !== '=') {
			// Is no expression so return value
			return parameterValue;
		}

		// Is an expression

		// Remove the equal sign
		// eslint-disable-next-line no-param-reassign
		parameterValue = parameterValue.substr(1);

		// Generate a data proxy which allows to query workflow data
		const dataProxy = new WorkflowDataProxy(
			this.workflow,
			runExecutionData,
			runIndex,
			itemIndex,
			activeNodeName,
			connectionInputData,
			siblingParameters,
			mode,
			timezone,
			additionalKeys,
			executeData,
			-1,
			selfData,
		);
		const data = dataProxy.getDataProxy();

		// Support only a subset of process properties
		data.process = {
			arch: process.arch,
			env: process.env,
			platform: process.platform,
			pid: process.pid,
			ppid: process.ppid,
			release: process.release,
			version: process.pid,
			versions: process.versions,
		};

		/**
		 * Denylist
		 */

		data.document = {};
		data.global = {};
		data.window = {};
		data.Window = {};
		data.this = {};
		data.globalThis = {};
		data.self = {};

		// Alerts
		data.alert = {};
		data.prompt = {};
		data.confirm = {};

		// Prevent Remote Code Execution
		data.eval = {};
		data.uneval = {};
		data.setTimeout = {};
		data.setInterval = {};
		data.Function = {};

		// Prevent requests
		data.fetch = {};
		data.XMLHttpRequest = {};

		// Prevent control abstraction
		data.Promise = {};
		data.Generator = {};
		data.GeneratorFunction = {};
		data.AsyncFunction = {};
		data.AsyncGenerator = {};
		data.AsyncGeneratorFunction = {};

		// Prevent WASM
		data.WebAssembly = {};

		// Prevent Reflection
		data.Reflect = {};
		data.Proxy = {};

		// @ts-ignore
		data.constructor = {};

		// Deprecated
		data.escape = {};
		data.unescape = {};

		/**
		 * Allowlist
		 */

		// Dates
		data.Date = Date;
		data.DateTime = DateTime;
		data.Interval = Interval;
		data.Duration = Duration;

		// Objects
		data.Object = Object;

		// Arrays
		data.Array = Array;
		data.Int8Array = Int8Array;
		data.Uint8Array = Uint8Array;
		data.Uint8ClampedArray = Uint8ClampedArray;
		data.Int16Array = Int16Array;
		data.Uint16Array = Uint16Array;
		data.Int32Array = Int32Array;
		data.Uint32Array = Uint32Array;
		data.Float32Array = Float32Array;
		data.Float64Array = Float64Array;
		data.BigInt64Array = typeof BigInt64Array !== 'undefined' ? BigInt64Array : {};
		data.BigUint64Array = typeof BigUint64Array !== 'undefined' ? BigUint64Array : {};

		// Collections
		data.Map = typeof Map !== 'undefined' ? Map : {};
		data.WeakMap = typeof WeakMap !== 'undefined' ? WeakMap : {};
		data.Set = typeof Set !== 'undefined' ? Set : {};
		data.WeakSet = typeof WeakSet !== 'undefined' ? WeakSet : {};

		// Errors
		data.Error = Error;
		data.TypeError = TypeError;
		data.SyntaxError = SyntaxError;
		data.EvalError = EvalError;
		data.RangeError = RangeError;
		data.ReferenceError = ReferenceError;
		data.URIError = URIError;

		// Internationalization
		data.Intl = typeof Intl !== 'undefined' ? Intl : {};

		// Text
		// eslint-disable-next-line id-denylist
		data.String = String;
		data.RegExp = RegExp;

		// Math
		data.Math = Math;
		// eslint-disable-next-line id-denylist
		data.Number = Number;
		data.BigInt = typeof BigInt !== 'undefined' ? BigInt : {};
		data.Infinity = Infinity;
		data.NaN = NaN;
		data.isFinite = Number.isFinite;
		data.isNaN = Number.isNaN;
		data.parseFloat = parseFloat;
		data.parseInt = parseInt;

		// Structured data
		data.JSON = JSON;
		data.ArrayBuffer = typeof ArrayBuffer !== 'undefined' ? ArrayBuffer : {};
		data.SharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : {};
		data.Atomics = typeof Atomics !== 'undefined' ? Atomics : {};
		data.DataView = typeof DataView !== 'undefined' ? DataView : {};

		data.encodeURI = encodeURI;
		data.encodeURIComponent = encodeURIComponent;
		data.decodeURI = decodeURI;
		data.decodeURIComponent = decodeURIComponent;

		// Other
		// eslint-disable-next-line id-denylist
		data.Boolean = Boolean;
		data.Symbol = Symbol;

		const constructorValidation = new RegExp(/\.\s*constructor/gm);
		if (parameterValue.match(constructorValidation)) {
			throw new ExpressionError('Expression contains invalid constructor function call', {
				causeDetailed: 'Constructor override attempt is not allowed due to security concerns',
				runIndex,
				itemIndex,
			});
		}

		// Execute the expression
		const returnValue = this.renderExpression(parameterValue, data);
		if (typeof returnValue === 'function') {
			throw new Error('Expression resolved to a function. Please add "()"');
		} else if (typeof returnValue === 'string') {
			return returnValue;
		} else if (returnValue !== null && typeof returnValue === 'object') {
			if (returnObjectAsString) {
				return this.convertObjectValueToString(returnValue);
			}
		}

		return returnValue;
	}

	private renderExpression(expression: string, data: IWorkflowDataProxyData): tmpl.ReturnValue {
		try {
			return tmpl.tmpl(expression, data);
		} catch (error) {
			if (error instanceof ExpressionError) {
				// Ignore all errors except if they are ExpressionErrors and they are supposed
				// to fail the execution
				if (error.context.failExecution) {
					throw error;
				}
			}
		}
		return null;
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
	getSimpleParameterValue(
		node: INode,
		parameterValue: string | boolean | undefined,
		mode: WorkflowExecuteMode,
		timezone: string,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		defaultValue?: boolean | number | string,
	): boolean | number | string | undefined {
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

		return this.getParameterValue(
			parameterValue,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			timezone,
			additionalKeys,
			executeData,
		) as boolean | number | string | undefined;
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
	getComplexParameterValue(
		node: INode,
		parameterValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		mode: WorkflowExecuteMode,
		timezone: string,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		defaultValue:
			| NodeParameterValue
			| INodeParameters
			| NodeParameterValue[]
			| INodeParameters[]
			| undefined = undefined,
		selfData = {},
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | undefined {
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
		const returnData = this.getParameterValue(
			parameterValue,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			timezone,
			additionalKeys,
			executeData,
			false,
			selfData,
		);

		// Resolve the "inner" values
		return this.getParameterValue(
			returnData,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			timezone,
			additionalKeys,
			executeData,
			false,
			selfData,
		);
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
	getParameterValue(
		parameterValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		runExecutionData: IRunExecutionData | null,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		mode: WorkflowExecuteMode,
		timezone: string,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		returnObjectAsString = false,
		selfData = {},
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] {
		// Helper function which returns true when the parameter is a complex one or array
		const isComplexParameter = (
			value: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		) => {
			return typeof value === 'object';
		};

		// Helper function which resolves a parameter value depending on if it is simply or not
		const resolveParameterValue = (
			value: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
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
					timezone,
					additionalKeys,
					executeData,
					returnObjectAsString,
					selfData,
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
				timezone,
				additionalKeys,
				executeData,
				returnObjectAsString,
				selfData,
			);
		};

		// Check if it value is a simple one that we can get it resolved directly
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
				timezone,
				additionalKeys,
				executeData,
				returnObjectAsString,
				selfData,
			);
		}

		// The parameter value is complex so resolve depending on type
		if (Array.isArray(parameterValue)) {
			// Data is an array
			const returnData = parameterValue.map((item) => resolveParameterValue(item, {}));
			return returnData as NodeParameterValue[] | INodeParameters[];
		}

		if (parameterValue === null || parameterValue === undefined) {
			return parameterValue;
		}

		if (typeof parameterValue !== 'object') {
			return {};
		}

		// Data is an object
		const returnData: INodeParameters = {};
		// eslint-disable-next-line no-restricted-syntax
		for (const [key, value] of Object.entries(parameterValue)) {
			returnData[key] = resolveParameterValue(value, parameterValue);
		}

		if (returnObjectAsString && typeof returnData === 'object') {
			return this.convertObjectValueToString(returnData);
		}

		return returnData;
	}
}
