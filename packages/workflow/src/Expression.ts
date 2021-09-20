/* eslint-disable func-names */
/* eslint-disable no-extend-native */
// @ts-ignore
import * as tmpl from 'riot-tmpl';
import { DateTime,/*DateTimeFormatOptions,*/ DurationObjectUnits, /*DurationUnits */} from 'luxon';
// eslint-disable-next-line import/no-cycle
import {
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValue,
	Workflow,
	WorkflowDataProxy,
	WorkflowExecuteMode,
} from '.';

// Set it to use double curly brackets instead of single ones
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
tmpl.brackets.set('{{ }}');

// Make sure that it does not always print an error when it could not resolve
// a variable
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
tmpl.tmpl.errorHandler = () => {};

export class Expression {
	workflow: Workflow;

	constructor(workflow: Workflow) {
		this.workflow = workflow;
	}

	static extendTypes(): void {
		const generateDurationObject = (
			value: number,
			unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
		) => {
			const durationObject = {} as DurationObjectUnits;

			if (unit === 'minute') {
				durationObject.minutes = value;
			} else if (unit === 'hour') {
				durationObject.hours = value;
			} else if (unit === 'day') {
				durationObject.days = value;
			} else if (unit === 'week') {
				durationObject.weeks = value;
			} else if (unit === 'month') {
				durationObject.months = value;
			} else if (unit === 'year') {
				durationObject.years = value;
			}
			return durationObject;
		};

		// @ts-ignore
		Date.prototype.plus = function (
			value: number,
			unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
		) {
			return DateTime.fromJSDate(this).plus(generateDurationObject(value, unit)).toJSDate();
		};

		// @ts-ignore
		Date.prototype.isDst = function () {
			return DateTime.fromJSDate(this).isInDST;
		};

		// @ts-ignore
		Date.prototype.isInLast = function (
			value: number,
			unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
		) {
			const dateInThePast = DateTime.now().minus(generateDurationObject(value, unit));
			const thisDate = DateTime.fromJSDate(this);
			return dateInThePast <= thisDate && thisDate <= DateTime.now();
		};

		// @ts-ignore
		Date.prototype.isBetween = function (firstDate: date, secondDate: date) {
			if (firstDate > secondDate) {
				return secondDate < this && this < firstDate;
			}
			return secondDate > this && this > firstDate;
		};

		// @ts-ignore
		Date.prototype.minus = function (
			value: number,
			unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
		) {
			return DateTime.fromJSDate(this).minus(generateDurationObject(value, unit)).toJSDate();
		};

		// @ts-ignore
		Date.prototype.begginingOf = function (unit: 'hour' | 'day' | 'week' | 'month' | 'year') {
			return DateTime.fromJSDate(this).startOf(unit).toJSDate();
		};

		// @ts-ignore
		Date.prototype.endOfMonth = function () {
			return DateTime.fromJSDate(this).endOf('month').toJSDate();
		};

		// @ts-ignore
		Date.prototype.extract = function (
			part:
				| 'day'
				| 'month'
				| 'year'
				| 'hour'
				| 'minute'
				| 'second'
				| 'weekNumber'
				| 'yearDayNumber'
				| 'weekday',
		) {
			if (part === 'yearDayNumber') {
				const firstDayOfTheYear = new Date(this.getFullYear(), 0, 0);
				const diff =
					this.getTime() -
					firstDayOfTheYear.getTime() +
					(firstDayOfTheYear.getTimezoneOffset() - this.getTimezoneOffset()) * 60 * 1000;
				return Math.floor(diff / (1000 * 60 * 60 * 24));
			}

			return DateTime.fromJSDate(this)[part];
		};

		// @ts-ignore
		Date.prototype.isWeekend = function () {
			return [6, 7].includes(DateTime.fromJSDate(this).weekday);
		};

		// @ts-ignore
		Date.prototype.timeTo = function (date: Date, unit: DurationUnits = 'seconds') {
			return DateTime.fromJSDate(this).diff(DateTime.fromJSDate(date), unit);
		};

		// @ts-ignore
		Date.prototype.toLocaleString = function (format: DateTimeFormatOptions) {
			return DateTime.fromJSDate(this).toLocaleString(format);
		};

		// @ts-ignore
		Date.prototype.format = function (format: string) {
			return DateTime.fromJSDate(this).toFormat(format);
		};

		// @ts-ignore
		Date.prototype.toTimeFromNow = function () {
			const diffObj = DateTime.fromJSDate(this).diffNow().toObject();

			if (diffObj.years) {
				return `${diffObj.years} years ago`;
			}
			if (diffObj.months) {
				return `${diffObj.months} months ago`;
			}
			if (diffObj.weeks) {
				return `${diffObj.weeks} weeks ago`;
			}
			if (diffObj.days) {
				return `${diffObj.days} days ago`;
			}
			if (diffObj.hours) {
				return `${diffObj.hours} hours ago`;
			}
			if (diffObj.minutes) {
				return `${diffObj.minutes} minutes ago`;
			}
			if (diffObj.seconds && diffObj.seconds > 10) {
				return `${diffObj.seconds} seconds ago`;
			}
			return 'just now';
		};

		// @ts-ignore
		// Object.prototype.isBlank = function () {
		// 	if (this instanceof String) {
		// 		return this === '';
		// 	}
		// 	if (this instanceof Number) {
		// 		return this === 0;
		// 	}
		// 	if (this instanceof Array) {
		// 		return this.length === 0;
		// 	}
		// 	if (this instanceof Object) {
		// 		return Object.keys(this).length === 0;
		// 	}
		// 	return false;
		// };

		// // @ts-ignore
		// Object.prototype.isPresent = function () {
		// 	// @ts-ignore
		// 	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		// 	return !this.isBlank();
		// };
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
			additionalKeys,
			-1,
			selfData,
		);
		const data = dataProxy.getDataProxy();

		// Execute the expression
		try {
			// eslint-disable-next-line no-param-reassign
			parameterValue = `{{ __extendTypes() }}${parameterValue}`;
			// @ts-ignore
			data.__extendTypes = Expression.extendTypes;
			// @ts-ignore
			data.now = new Date();
			// TODO: Investigate why this won't work with Luxon
			const dateToday = new Date();
			dateToday.setHours(0);
			dateToday.setMinutes(0);
			dateToday.setSeconds(0);
			// @ts-ignore
			data.today = dateToday;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			const returnValue = tmpl.tmpl(parameterValue, data);
			if (typeof returnValue === 'function') {
				throw new Error('Expression resolved to a function. Please add "()"');
			} else if (returnValue !== null && typeof returnValue === 'object') {
				if (returnObjectAsString) {
					return this.convertObjectValueToString(returnValue);
				}
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return returnValue;
		} catch (e) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
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
	getSimpleParameterValue(
		node: INode,
		parameterValue: string | boolean | undefined,
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
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
			additionalKeys,
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
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
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
			additionalKeys,
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
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
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
					additionalKeys,
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
				additionalKeys,
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
				additionalKeys,
				returnObjectAsString,
				selfData,
			);
		}

		// The parameter value is complex so resolve depending on type

		if (Array.isArray(parameterValue)) {
			// Data is an array
			const returnData = [];
			// eslint-disable-next-line no-restricted-syntax
			for (const item of parameterValue) {
				returnData.push(resolveParameterValue(item, {}));
			}

			if (returnObjectAsString && typeof returnData === 'object') {
				return this.convertObjectValueToString(returnData);
			}

			return returnData as NodeParameterValue[] | INodeParameters[];
		}
		if (parameterValue === null || parameterValue === undefined) {
			return parameterValue;
		}
		// Data is an object
		const returnData: INodeParameters = {};
		// eslint-disable-next-line no-restricted-syntax
		for (const key of Object.keys(parameterValue)) {
			returnData[key] = resolveParameterValue(
				(parameterValue as INodeParameters)[key],
				parameterValue as INodeParameters,
			);
		}

		if (returnObjectAsString && typeof returnData === 'object') {
			return this.convertObjectValueToString(returnData);
		}
		return returnData;
	}
}
