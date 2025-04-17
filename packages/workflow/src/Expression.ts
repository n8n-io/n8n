import * as tmpl from '@n8n_io/riot-tmpl';
import { DateTime, Duration, Interval } from 'luxon';

import { ApplicationError } from './errors/application.error';
import { ExpressionExtensionError } from './errors/expression-extension.error';
import { ExpressionError } from './errors/expression.error';
import { evaluateExpression, setErrorHandler } from './ExpressionEvaluatorProxy';
import { sanitizer, sanitizerName } from './ExpressionSandboxing';
import { extend, extendOptional } from './Extensions';
import { extendSyntax } from './Extensions/ExpressionExtension';
import { extendedFunctions } from './Extensions/ExtendedFunctions';
import { getGlobalState } from './GlobalState';
import type {
	IDataObject,
	IExecuteData,
	INode,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodeParameters,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	NodeParameterValue,
	NodeParameterValueType,
	WorkflowExecuteMode,
} from './Interfaces';
import type { Workflow } from './Workflow';
import { WorkflowDataProxy } from './WorkflowDataProxy';

const IS_FRONTEND_IN_DEV_MODE =
	typeof process === 'object' &&
	Object.keys(process).length === 1 &&
	'env' in process &&
	Object.keys(process.env).length === 0;

const IS_FRONTEND = typeof process === 'undefined' || IS_FRONTEND_IN_DEV_MODE;

const isSyntaxError = (error: unknown): error is SyntaxError =>
	error instanceof SyntaxError || (error instanceof Error && error.name === 'SyntaxError');

const isExpressionError = (error: unknown): error is ExpressionError =>
	error instanceof ExpressionError || error instanceof ExpressionExtensionError;

const isTypeError = (error: unknown): error is TypeError =>
	error instanceof TypeError || (error instanceof Error && error.name === 'TypeError');

// Make sure that error get forwarded
setErrorHandler((error: Error) => {
	if (isExpressionError(error)) throw error;
});

export class Expression {
	constructor(private readonly workflow: Workflow) {}

	static resolveWithoutWorkflow(expression: string, data: IDataObject = {}) {
		return tmpl.tmpl(expression, data);
	}

	/**
	 * Converts an object to a string in a way to make it clear that
	 * the value comes from an object
	 *
	 */
	convertObjectValueToString(value: object): string {
		if (value instanceof DateTime && value.invalidReason !== null) {
			throw new ApplicationError('invalid DateTime');
		}

		if (value === null) {
			return 'null';
		}

		let typeName = value.constructor.name ?? 'Object';
		if (DateTime.isDateTime(value)) {
			typeName = 'DateTime';
		}

		let result = '';
		if (value instanceof Date) {
			// We don't want to use JSON.stringify for dates since it disregards workflow timezone
			result = DateTime.fromJSDate(value, {
				zone: this.workflow.settings?.timezone ?? getGlobalState().defaultTimezone,
			}).toISO();
		} else if (DateTime.isDateTime(value)) {
			result = value.toString();
		} else {
			result = JSON.stringify(value);
		}

		result = result
			.replace(/,"/g, ', "') // spacing for
			.replace(/":/g, '": '); // readability

		return `[${typeName}: ${result}]`;
	}

	/**
	 * Resolves the parameter value.  If it is an expression it will execute it and
	 * return the result. For everything simply the supplied value will be returned.
	 *
	 * @param {(IRunExecutionData | null)} runExecutionData
	 * @param {boolean} [returnObjectAsString=false]
	 */
	// TODO: Clean that up at some point and move all the options into an options object
	// eslint-disable-next-line complexity
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
		// Check if it is an expression
		if (typeof parameterValue !== 'string' || parameterValue.charAt(0) !== '=') {
			// Is no expression so return value
			return parameterValue;
		}

		// Is an expression

		// Remove the equal sign

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
			additionalKeys,
			executeData,
			-1,
			selfData,
			contextNodeName,
		);
		const data = dataProxy.getDataProxy();

		// Support only a subset of process properties
		data.process =
			typeof process !== 'undefined'
				? {
						arch: process.arch,
						env: process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE === 'true' ? {} : process.env,
						platform: process.platform,
						pid: process.pid,
						ppid: process.ppid,
						release: process.release,
						version: process.pid,
						versions: process.versions,
					}
				: {};

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

		// expression extensions
		data.extend = extend;
		data.extendOptional = extendOptional;

		data[sanitizerName] = sanitizer;

		Object.assign(data, extendedFunctions);

		const constructorValidation = new RegExp(/\.\s*constructor/gm);
		if (parameterValue.match(constructorValidation)) {
			throw new ExpressionError('Expression contains invalid constructor function call', {
				causeDetailed: 'Constructor override attempt is not allowed due to security concerns',
				runIndex,
				itemIndex,
			});
		}

		// Execute the expression
		const extendedExpression = extendSyntax(parameterValue);
		const returnValue = this.renderExpression(extendedExpression, data);
		if (typeof returnValue === 'function') {
			if (returnValue.name === '$') throw new ApplicationError('invalid syntax');

			if (returnValue.name === 'DateTime')
				throw new ApplicationError('this is a DateTime, please access its methods');

			throw new ApplicationError('this is a function, please add ()');
		} else if (typeof returnValue === 'string') {
			return returnValue;
		} else if (returnValue !== null && typeof returnValue === 'object') {
			if (returnObjectAsString) {
				return this.convertObjectValueToString(returnValue);
			}
		}

		return returnValue;
	}

	private renderExpression(
		expression: string,
		data: IWorkflowDataProxyData,
	): tmpl.ReturnValue | undefined {
		try {
			return evaluateExpression(expression, data);
		} catch (error) {
			if (isExpressionError(error)) throw error;

			if (isSyntaxError(error)) throw new ApplicationError('invalid syntax');

			if (isTypeError(error) && IS_FRONTEND && error.message.endsWith('is not a function')) {
				const match = error.message.match(/(?<msg>[^.]+is not a function)/);

				if (!match?.groups?.msg) return null;

				throw new ApplicationError(match.groups.msg);
			}
		}

		return null;
	}

	/**
	 * Resolves value of parameter. But does not work for workflow-data.
	 *
	 * @param {(string | undefined)} parameterValue
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
			additionalKeys,
			executeData,
		) as boolean | number | string | undefined;
	}

	/**
	 * Resolves value of complex parameter. But does not work for workflow-data.
	 *
	 * @param {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[])} parameterValue
	 * @param {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | undefined)} [defaultValue]
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
	 * @param {boolean} [returnObjectAsString=false]
	 */
	// TODO: Clean that up at some point and move all the options into an options object
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
				additionalKeys,
				executeData,
				returnObjectAsString,
				selfData,
				contextNodeName,
			);
		}

		// The parameter value is complex so resolve depending on type
		if (Array.isArray(parameterValue)) {
			// Data is an array
			const returnData = parameterValue.map((item) =>
				resolveParameterValue(item as NodeParameterValueType, {}),
			);
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
}
