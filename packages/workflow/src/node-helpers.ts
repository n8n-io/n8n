/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';

import { EXECUTE_WORKFLOW_NODE_TYPE, WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE } from './constants';
import { ApplicationError } from '@n8n/errors';
import { NodeConnectionTypes } from './interfaces';
import type {
	FieldType,
	IContextObject,
	INode,
	INodeCredentialDescription,
	INodeIssueObjectProperty,
	INodeIssues,
	INodeParameterResourceLocator,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyMode,
	INodePropertyModeValidation,
	INodePropertyOptions,
	INodePropertyRegexValidation,
	INodeType,
	IParameterDependencies,
	IRunExecutionData,
	IVersionedNodeType,
	NodeParameterValue,
	ResourceMapperValue,
	INodeTypeDescription,
	INodeOutputConfiguration,
	INodeInputConfiguration,
	GenericValue,
	DisplayCondition,
	NodeConnectionType,
} from './interfaces';
import { validateFilterParameter } from './node-parameters/filter-parameter';
import {
	isFilterValue,
	isINodePropertyOptionsList,
	isResourceLocatorValue,
	isResourceMapperValue,
	isValidResourceLocatorParameterValue,
} from './type-guards';
import { validateFieldType } from './type-validation';
import { deepCopy } from './utils';
import type { Workflow } from './workflow';

export const cronNodeOptions: INodePropertyCollection[] = [
	{
		name: 'item',
		displayName: 'Item',
		values: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Every Minute',
						value: 'everyMinute',
					},
					{
						name: 'Every Hour',
						value: 'everyHour',
					},
					{
						name: 'Every Day',
						value: 'everyDay',
					},
					{
						name: 'Every Week',
						value: 'everyWeek',
					},
					{
						name: 'Every Month',
						value: 'everyMonth',
					},
					{
						name: 'Every X',
						value: 'everyX',
					},
					{
						name: 'Custom',
						value: 'custom',
					},
				],
				default: 'everyDay',
				description: 'How often to trigger.',
			},
			{
				displayName: 'Hour',
				name: 'hour',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 23,
				},
				displayOptions: {
					hide: {
						mode: ['custom', 'everyHour', 'everyMinute', 'everyX'],
					},
				},
				default: 14,
				description: 'The hour of the day to trigger (24h format)',
			},
			{
				displayName: 'Minute',
				name: 'minute',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 59,
				},
				displayOptions: {
					hide: {
						mode: ['custom', 'everyMinute', 'everyX'],
					},
				},
				default: 0,
				description: 'The minute of the day to trigger',
			},
			{
				displayName: 'Day of Month',
				name: 'dayOfMonth',
				type: 'number',
				displayOptions: {
					show: {
						mode: ['everyMonth'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 31,
				},
				default: 1,
				description: 'The day of the month to trigger',
			},
			{
				displayName: 'Weekday',
				name: 'weekday',
				type: 'options',
				displayOptions: {
					show: {
						mode: ['everyWeek'],
					},
				},
				options: [
					{
						name: 'Monday',
						value: '1',
					},
					{
						name: 'Tuesday',
						value: '2',
					},
					{
						name: 'Wednesday',
						value: '3',
					},
					{
						name: 'Thursday',
						value: '4',
					},
					{
						name: 'Friday',
						value: '5',
					},
					{
						name: 'Saturday',
						value: '6',
					},
					{
						name: 'Sunday',
						value: '0',
					},
				],
				default: '1',
				description: 'The weekday to trigger',
			},
			{
				displayName: 'Cron Expression',
				name: 'cronExpression',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['custom'],
					},
				},
				default: '* * * * * *',
				description:
					'Use custom cron expression. Values and ranges as follows:<ul><li>Seconds: 0-59</li><li>Minutes: 0 - 59</li><li>Hours: 0 - 23</li><li>Day of Month: 1 - 31</li><li>Months: 0 - 11 (Jan - Dec)</li><li>Day of Week: 0 - 6 (Sun - Sat)</li></ul>',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1000,
				},
				displayOptions: {
					show: {
						mode: ['everyX'],
					},
				},
				default: 2,
				description: 'All how many X minutes/hours it should trigger',
			},
			{
				displayName: 'Unit',
				name: 'unit',
				type: 'options',
				displayOptions: {
					show: {
						mode: ['everyX'],
					},
				},
				options: [
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
				],
				default: 'hours',
				description: 'If it should trigger all X minutes or hours',
			},
		],
	},
];

/**
 * Determines if the provided node type has any output types other than the main connection type.
 * @param typeDescription The node's type description to check.
 */
export function isSubNodeType(
	typeDescription: Pick<INodeTypeDescription, 'outputs'> | null,
): boolean {
	if (!typeDescription?.outputs || typeof typeDescription.outputs === 'string') {
		return false;
	}
	const outputTypes = getConnectionTypes(typeDescription.outputs);
	return outputTypes
		? outputTypes.filter((output) => output !== NodeConnectionTypes.Main).length > 0
		: false;
}

const getPropertyValues = (
	nodeValues: INodeParameters,
	propertyName: string,
	node: Pick<INode, 'typeVersion'> | null,
	nodeTypeDescription: INodeTypeDescription | null,
	nodeValuesRoot: INodeParameters,
) => {
	let value;
	if (propertyName.charAt(0) === '/') {
		// Get the value from the root of the node
		value = get(nodeValuesRoot, propertyName.slice(1));
	} else if (propertyName === '@version') {
		value = node?.typeVersion || 0;
	} else if (propertyName === '@tool') {
		value = nodeTypeDescription?.name.endsWith('Tool') ?? false;
	} else {
		// Get the value from current level
		value = get(nodeValues, propertyName);
	}

	if (value && typeof value === 'object' && '__rl' in value && value.__rl) {
		value = value.value;
	}

	if (!Array.isArray(value)) {
		return [value as NodeParameterValue];
	} else {
		return value as NodeParameterValue[];
	}
};

const checkConditions = (
	conditions: Array<NodeParameterValue | DisplayCondition>,
	actualValues: NodeParameterValue[],
) => {
	return conditions.some((condition) => {
		if (
			condition &&
			typeof condition === 'object' &&
			condition._cnd &&
			Object.keys(condition).length === 1
		) {
			const [key, targetValue] = Object.entries(condition._cnd)[0];

			return actualValues.every((propertyValue) => {
				if (key === 'eq') {
					return isEqual(propertyValue, targetValue);
				}
				if (key === 'not') {
					return !isEqual(propertyValue, targetValue);
				}
				if (key === 'gte') {
					return (propertyValue as number) >= targetValue;
				}
				if (key === 'lte') {
					return (propertyValue as number) <= targetValue;
				}
				if (key === 'gt') {
					return (propertyValue as number) > targetValue;
				}
				if (key === 'lt') {
					return (propertyValue as number) < targetValue;
				}
				if (key === 'between') {
					const { from, to } = targetValue as { from: number; to: number };
					return (propertyValue as number) >= from && (propertyValue as number) <= to;
				}
				if (key === 'includes') {
					return (propertyValue as string).includes(targetValue);
				}
				if (key === 'startsWith') {
					return (propertyValue as string).startsWith(targetValue);
				}
				if (key === 'endsWith') {
					return (propertyValue as string).endsWith(targetValue);
				}
				if (key === 'regex') {
					return new RegExp(targetValue as string).test(propertyValue as string);
				}
				if (key === 'exists') {
					return propertyValue !== null && propertyValue !== undefined && propertyValue !== '';
				}
				return false;
			});
		}

		return actualValues.includes(condition as NodeParameterValue);
	});
};

/**
 * Returns if the parameter should be displayed or not
 *
 * @param {INodeParameters} nodeValues The data on the node which decides if the parameter
 *                                    should be displayed
 * @param {(INodeProperties | INodeCredentialDescription)} parameter The parameter to check if it should be displayed
 * @param {INodeParameters} [nodeValuesRoot] The root node-parameter-data
 */
export function displayParameter(
	nodeValues: INodeParameters,
	parameter: INodeProperties | INodeCredentialDescription | INodePropertyOptions,
	node: Pick<INode, 'typeVersion'> | null, // Allow null as it does also get used by credentials and they do not have versioning yet
	nodeTypeDescription: INodeTypeDescription | null,
	nodeValuesRoot?: INodeParameters,
	displayKey: 'displayOptions' | 'disabledOptions' = 'displayOptions',
) {
	if (!parameter[displayKey]) {
		return true;
	}

	const { show, hide } = parameter[displayKey];

	nodeValuesRoot = nodeValuesRoot || nodeValues;

	if (show) {
		// All the defined rules have to match to display parameter
		for (const propertyName of Object.keys(show)) {
			const values = getPropertyValues(
				nodeValues,
				propertyName,
				node,
				nodeTypeDescription,
				nodeValuesRoot,
			);

			if (values.some((v) => typeof v === 'string' && v.charAt(0) === '=')) {
				return true;
			}

			if (values.length === 0 || !checkConditions(show[propertyName]!, values)) {
				return false;
			}
		}
	}

	if (hide) {
		// Any of the defined hide rules have to match to hide the parameter
		for (const propertyName of Object.keys(hide)) {
			const values = getPropertyValues(
				nodeValues,
				propertyName,
				node,
				nodeTypeDescription,
				nodeValuesRoot,
			);

			if (values.length !== 0 && checkConditions(hide[propertyName]!, values)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Returns if the given parameter should be displayed or not considering the path
 * to the properties
 *
 * @param {INodeParameters} nodeValues The data on the node which decides if the parameter
 *                                    should be displayed
 * @param {(INodeProperties | INodeCredentialDescription)} parameter The parameter to check if it should be displayed
 * @param {string} path The path to the property
 */
export function displayParameterPath(
	nodeValues: INodeParameters,
	parameter: INodeProperties | INodeCredentialDescription | INodePropertyOptions,
	path: string,
	node: Pick<INode, 'typeVersion'> | null,
	nodeTypeDescription: INodeTypeDescription | null,
	displayKey: 'displayOptions' | 'disabledOptions' = 'displayOptions',
) {
	let resolvedNodeValues = nodeValues;
	if (path !== '') {
		resolvedNodeValues = get(nodeValues, path) as INodeParameters;
	}

	// Get the root parameter data
	let nodeValuesRoot = nodeValues;
	if (path && path.split('.').indexOf('parameters') === 0) {
		nodeValuesRoot = get(nodeValues, 'parameters') as INodeParameters;
	}

	return displayParameter(
		resolvedNodeValues,
		parameter,
		node,
		nodeTypeDescription,
		nodeValuesRoot,
		displayKey,
	);
}

/**
 * Returns the context data
 *
 * @param {IRunExecutionData} runExecutionData The run execution data
 * @param {string} type The data type. "node"/"flow"
 * @param {INode} [node] If type "node" is set the node to return the context of has to be supplied
 */
export function getContext(
	runExecutionData: IRunExecutionData,
	type: string,
	node?: INode,
): IContextObject {
	if (runExecutionData.executionData === undefined) {
		// TODO: Should not happen leave it for test now
		throw new ApplicationError('`executionData` is not initialized');
	}

	let key: string;
	if (type === 'flow') {
		key = 'flow';
	} else if (type === 'node') {
		if (node === undefined) {
			// @TODO: What does this mean?
			throw new ApplicationError(
				'The request data of context type "node" the node parameter has to be set!',
			);
		}
		key = `node:${node.name}`;
	} else {
		throw new ApplicationError('Unknown context type. Only `flow` and `node` are supported.', {
			extra: { contextType: type },
		});
	}

	if (runExecutionData.executionData.contextData[key] === undefined) {
		runExecutionData.executionData.contextData[key] = {};
	}

	return runExecutionData.executionData.contextData[key];
}

/**
 * Returns which parameters are dependent on which
 */
function getParameterDependencies(nodePropertiesArray: INodeProperties[]): IParameterDependencies {
	const dependencies: IParameterDependencies = {};

	for (const nodeProperties of nodePropertiesArray) {
		const { name, displayOptions } = nodeProperties;

		if (!dependencies[name]) {
			dependencies[name] = [];
		}

		if (!displayOptions) {
			// Does not have any dependencies
			continue;
		}

		for (const displayRule of Object.values(displayOptions)) {
			for (const parameterName of Object.keys(displayRule)) {
				if (!dependencies[name].includes(parameterName)) {
					if (parameterName.charAt(0) === '@') {
						// Is a special parameter so can be skipped
						continue;
					}
					dependencies[name].push(parameterName);
				}
			}
		}
	}

	return dependencies;
}

/**
 * Returns in which order the parameters should be resolved
 * to have the parameters available they depend on
 */
function getParameterResolveOrder(
	nodePropertiesArray: INodeProperties[],
	parameterDependencies: IParameterDependencies,
): number[] {
	const executionOrder: number[] = [];
	const indexToResolve = Array.from({ length: nodePropertiesArray.length }, (_, k) => k);
	const resolvedParameters: string[] = [];

	let index: number;
	let property: INodeProperties;

	let lastIndexLength = indexToResolve.length;
	let lastIndexReduction = -1;

	let iterations = 0;

	while (indexToResolve.length !== 0) {
		iterations += 1;

		index = indexToResolve.shift() as number;
		property = nodePropertiesArray[index];

		if (parameterDependencies[property.name].length === 0) {
			// Does not have any dependencies so simply add
			executionOrder.push(index);
			resolvedParameters.push(property.name);
			continue;
		}

		// Parameter has dependencies
		for (const dependency of parameterDependencies[property.name]) {
			if (!resolvedParameters.includes(dependency)) {
				if (dependency.charAt(0) === '/') {
					// Assume that root level dependencies are resolved
					continue;
				}
				// Dependencies for that parameter are still missing so
				// try to add again later
				indexToResolve.push(index);
				continue;
			}
		}

		// All dependencies got found so add
		executionOrder.push(index);
		resolvedParameters.push(property.name);

		if (indexToResolve.length < lastIndexLength) {
			lastIndexReduction = iterations;
		}

		if (iterations > lastIndexReduction + nodePropertiesArray.length) {
			throw new ApplicationError(
				'Could not resolve parameter dependencies. Max iterations reached! Hint: If `displayOptions` are specified in any child parameter of a parent `collection` or `fixedCollection`, remove the `displayOptions` from the child parameter.',
			);
		}
		lastIndexLength = indexToResolve.length;
	}

	return executionOrder;
}

type GetNodeParametersOptions = {
	onlySimpleTypes?: boolean;
	dataIsResolved?: boolean; // If nodeValues are already fully resolved (so that all default values got added already)
	nodeValuesRoot?: INodeParameters;
	parentType?: string;
	parameterDependencies?: IParameterDependencies;
};

/**
 * Returns the node parameter values. Depending on the settings it either just returns the none
 * default values or it applies all the default values.
 *
 * @param {INodeProperties[]} nodePropertiesArray The properties which exist and their settings
 * @param {INodeParameters} nodeValues The node parameter data
 * @param {boolean} returnDefaults If default values get added or only none default values returned
 * @param {boolean} returnNoneDisplayed If also values which should not be displayed should be returned
 * @param {GetNodeParametersOptions} options Optional properties
 */
// eslint-disable-next-line complexity
export function getNodeParameters(
	nodePropertiesArray: INodeProperties[],
	nodeValues: INodeParameters | null,
	returnDefaults: boolean,
	returnNoneDisplayed: boolean,
	node: Pick<INode, 'typeVersion'> | null,
	nodeTypeDescription: INodeTypeDescription | null,
	options?: GetNodeParametersOptions,
): INodeParameters | null {
	let { nodeValuesRoot, parameterDependencies } = options ?? {};
	const { onlySimpleTypes = false, dataIsResolved = false, parentType } = options ?? {};
	if (parameterDependencies === undefined) {
		parameterDependencies = getParameterDependencies(nodePropertiesArray);
	}

	// Get the parameter names which get used multiple times as for this
	// ones we have to always check which ones get displayed and which ones not
	const duplicateParameterNames: string[] = [];
	const parameterNames: string[] = [];
	for (const nodeProperties of nodePropertiesArray) {
		if (parameterNames.includes(nodeProperties.name)) {
			if (!duplicateParameterNames.includes(nodeProperties.name)) {
				duplicateParameterNames.push(nodeProperties.name);
			}
		} else {
			parameterNames.push(nodeProperties.name);
		}
	}

	const nodeParameters: INodeParameters = {};
	const nodeParametersFull: INodeParameters = {};

	let nodeValuesDisplayCheck = nodeParametersFull;
	if (!dataIsResolved && !returnNoneDisplayed) {
		nodeValuesDisplayCheck = getNodeParameters(
			nodePropertiesArray,
			nodeValues,
			true,
			true,
			node,
			nodeTypeDescription,
			{
				onlySimpleTypes: true,
				dataIsResolved: true,
				nodeValuesRoot,
				parentType,
				parameterDependencies,
			},
		) as INodeParameters;
	}

	nodeValuesRoot = nodeValuesRoot || nodeValuesDisplayCheck;

	// Go through the parameters in order of their dependencies
	const parameterIterationOrderIndex = getParameterResolveOrder(
		nodePropertiesArray,
		parameterDependencies,
	);

	for (const parameterIndex of parameterIterationOrderIndex) {
		const nodeProperties = nodePropertiesArray[parameterIndex];
		if (
			!nodeValues ||
			(nodeValues[nodeProperties.name] === undefined &&
				(!returnDefaults || parentType === 'collection'))
		) {
			// The value is not defined so go to the next
			continue;
		}

		if (
			!returnNoneDisplayed &&
			!displayParameter(
				nodeValuesDisplayCheck,
				nodeProperties,
				node,
				nodeTypeDescription,
				nodeValuesRoot,
			)
		) {
			if (!returnNoneDisplayed || !returnDefaults) {
				continue;
			}
		}

		if (!['collection', 'fixedCollection'].includes(nodeProperties.type)) {
			// Is a simple property so can be set as it is

			if (duplicateParameterNames.includes(nodeProperties.name)) {
				if (
					!displayParameter(
						nodeValuesDisplayCheck,
						nodeProperties,
						node,
						nodeTypeDescription,
						nodeValuesRoot,
					)
				) {
					continue;
				}
			}

			if (returnDefaults) {
				// Set also when it has the default value
				if (['boolean', 'number', 'options'].includes(nodeProperties.type)) {
					// Boolean, numbers and options are special as false and 0 are valid values
					// and should not be replaced with default value
					nodeParameters[nodeProperties.name] =
						nodeValues[nodeProperties.name] !== undefined
							? nodeValues[nodeProperties.name]
							: nodeProperties.default;
				} else if (
					nodeProperties.type === 'resourceLocator' &&
					typeof nodeProperties.default === 'object'
				) {
					nodeParameters[nodeProperties.name] =
						nodeValues[nodeProperties.name] !== undefined
							? nodeValues[nodeProperties.name]
							: { __rl: true, ...nodeProperties.default };
				} else {
					nodeParameters[nodeProperties.name] =
						nodeValues[nodeProperties.name] ?? nodeProperties.default;
				}
				nodeParametersFull[nodeProperties.name] = nodeParameters[nodeProperties.name];
			} else if (
				(nodeValues[nodeProperties.name] !== nodeProperties.default &&
					typeof nodeValues[nodeProperties.name] !== 'object') ||
				(typeof nodeValues[nodeProperties.name] === 'object' &&
					!isEqual(nodeValues[nodeProperties.name], nodeProperties.default)) ||
				(nodeValues[nodeProperties.name] !== undefined && parentType === 'collection')
			) {
				// Set only if it is different to the default value
				nodeParameters[nodeProperties.name] = nodeValues[nodeProperties.name];
				nodeParametersFull[nodeProperties.name] = nodeParameters[nodeProperties.name];
				continue;
			}
		}

		if (onlySimpleTypes) {
			// It is only supposed to resolve the simple types. So continue.
			continue;
		}

		// Is a complex property so check lower levels
		let tempValue: INodeParameters | null;
		if (nodeProperties.type === 'collection') {
			// Is collection

			if (
				nodeProperties.typeOptions !== undefined &&
				nodeProperties.typeOptions.multipleValues === true
			) {
				// Multiple can be set so will be an array

				// Return directly the values like they are
				if (nodeValues[nodeProperties.name] !== undefined) {
					nodeParameters[nodeProperties.name] = nodeValues[nodeProperties.name];
				} else if (returnDefaults) {
					// Does not have values defined but defaults should be returned
					if (Array.isArray(nodeProperties.default)) {
						nodeParameters[nodeProperties.name] = deepCopy(nodeProperties.default);
					} else {
						// As it is probably wrong for many nodes, do we keep on returning an empty array if
						// anything else than an array is set as default
						nodeParameters[nodeProperties.name] = [];
					}
				}
				nodeParametersFull[nodeProperties.name] = nodeParameters[nodeProperties.name];
			} else if (nodeValues[nodeProperties.name] !== undefined) {
				// Has values defined so get them
				const tempNodeParameters = getNodeParameters(
					nodeProperties.options as INodeProperties[],
					nodeValues[nodeProperties.name] as INodeParameters,
					returnDefaults,
					returnNoneDisplayed,
					node,
					nodeTypeDescription,
					{
						onlySimpleTypes: false,
						dataIsResolved: false,
						nodeValuesRoot,
						parentType: nodeProperties.type,
					},
				);

				if (tempNodeParameters !== null) {
					nodeParameters[nodeProperties.name] = tempNodeParameters;
					nodeParametersFull[nodeProperties.name] = nodeParameters[nodeProperties.name];
				}
			} else if (returnDefaults) {
				// Does not have values defined but defaults should be returned
				nodeParameters[nodeProperties.name] = deepCopy(nodeProperties.default);
				nodeParametersFull[nodeProperties.name] = nodeParameters[nodeProperties.name];
			}
		} else if (nodeProperties.type === 'fixedCollection') {
			// Is fixedCollection

			const collectionValues: INodeParameters = {};
			let tempNodeParameters: INodeParameters;
			let tempNodePropertiesArray: INodeProperties[];
			let nodePropertyOptions: INodePropertyCollection | undefined;

			let propertyValues = nodeValues[nodeProperties.name];
			if (returnDefaults) {
				if (propertyValues === undefined) {
					propertyValues = deepCopy(nodeProperties.default);
				}
			}

			if (
				!returnDefaults &&
				nodeProperties.typeOptions?.multipleValues === false &&
				propertyValues &&
				Object.keys(propertyValues).length === 0
			) {
				// For fixedCollections, which only allow one value, it is important to still return
				// the empty object which indicates that a value got added, even if it does not have
				// anything set. If that is not done, the value would get lost.
				return nodeValues;
			}

			// Iterate over all collections
			for (const itemName of Object.keys(propertyValues || {})) {
				if (
					nodeProperties.typeOptions !== undefined &&
					nodeProperties.typeOptions.multipleValues === true
				) {
					// Multiple can be set so will be an array

					const tempArrayValue: INodeParameters[] = [];
					// Collection values should always be an object
					if (typeof propertyValues !== 'object' || Array.isArray(propertyValues)) {
						continue;
					}
					// Iterate over all items as it contains multiple ones
					for (const nodeValue of (propertyValues as INodeParameters)[
						itemName
					] as INodeParameters[]) {
						nodePropertyOptions = nodeProperties.options!.find(
							(nodePropertyOptions) => nodePropertyOptions.name === itemName,
						) as INodePropertyCollection;

						if (nodePropertyOptions === undefined) {
							throw new ApplicationError('Could not find property option', {
								extra: { propertyOption: itemName, property: nodeProperties.name },
							});
						}

						tempNodePropertiesArray = nodePropertyOptions.values!;
						tempValue = getNodeParameters(
							tempNodePropertiesArray,
							nodeValue,
							returnDefaults,
							returnNoneDisplayed,
							node,
							nodeTypeDescription,
							{
								onlySimpleTypes: false,
								dataIsResolved: false,
								nodeValuesRoot,
								parentType: nodeProperties.type,
							},
						);
						if (tempValue !== null) {
							tempArrayValue.push(tempValue);
						}
					}
					collectionValues[itemName] = tempArrayValue;
				} else {
					// Only one can be set so is an object of objects
					tempNodeParameters = {};

					// Get the options of the current item

					const nodePropertyOptions = nodeProperties.options!.find(
						(data) => data.name === itemName,
					);

					if (nodePropertyOptions !== undefined) {
						tempNodePropertiesArray = (nodePropertyOptions as INodePropertyCollection).values!;
						tempValue = getNodeParameters(
							tempNodePropertiesArray,
							(nodeValues[nodeProperties.name] as INodeParameters)[itemName] as INodeParameters,
							returnDefaults,
							returnNoneDisplayed,
							node,
							nodeTypeDescription,
							{
								onlySimpleTypes: false,
								dataIsResolved: false,
								nodeValuesRoot,
								parentType: nodeProperties.type,
							},
						);
						if (tempValue !== null) {
							Object.assign(tempNodeParameters, tempValue);
						}
					}

					if (Object.keys(tempNodeParameters).length !== 0) {
						collectionValues[itemName] = tempNodeParameters;
					}
				}
			}

			if (
				!returnDefaults &&
				nodeProperties.typeOptions?.multipleValues === false &&
				collectionValues &&
				Object.keys(collectionValues).length === 0 &&
				propertyValues &&
				propertyValues?.constructor.name === 'Object' &&
				Object.keys(propertyValues).length !== 0
			) {
				// For fixedCollections, which only allow one value, it is important to still return
				// the object with an empty collection property which indicates that a value got added
				// which contains all default values. If that is not done, the value would get lost.
				const returnValue = {} as INodeParameters;
				Object.keys(propertyValues || {}).forEach((value) => {
					returnValue[value] = {};
				});
				nodeParameters[nodeProperties.name] = returnValue;
			}

			if (Object.keys(collectionValues).length !== 0 || returnDefaults) {
				// Set only if value got found
				if (returnDefaults) {
					// Set also when it has the default value
					if (collectionValues === undefined) {
						nodeParameters[nodeProperties.name] = deepCopy(nodeProperties.default);
					} else {
						nodeParameters[nodeProperties.name] = collectionValues;
					}
					nodeParametersFull[nodeProperties.name] = nodeParameters[nodeProperties.name];
				} else if (collectionValues !== nodeProperties.default) {
					// Set only if values got found and it is not the default
					nodeParameters[nodeProperties.name] = collectionValues;
					nodeParametersFull[nodeProperties.name] = nodeParameters[nodeProperties.name];
				}
			}
		}
	}
	return nodeParameters;
}

/**
 * Returns the webhook path
 */
export function getNodeWebhookPath(
	workflowId: string,
	node: INode,
	path: string,
	isFullPath?: boolean,
	restartWebhook?: boolean,
) {
	let webhookPath = '';

	if (restartWebhook === true) {
		return path;
	}

	if (node.webhookId === undefined) {
		const nodeName = encodeURIComponent(node.name.toLowerCase());

		webhookPath = `${workflowId}/${nodeName}/${path}`;
	} else {
		if (isFullPath === true) {
			return path || node.webhookId;
		}

		webhookPath = `${node.webhookId}/${path}`;
	}
	return webhookPath;
}

/**
 * Returns the webhook URL
 */
export function getNodeWebhookUrl(
	baseUrl: string,
	workflowId: string,
	node: INode,
	path: string,
	isFullPath?: boolean,
): string {
	if ((path.startsWith(':') || path.includes('/:')) && node.webhookId) {
		// setting this to false to prefix the webhookId
		isFullPath = false;
	}
	if (path.startsWith('/')) {
		path = path.slice(1);
	}
	return `${baseUrl}/${getNodeWebhookPath(workflowId, node, path, isFullPath)}`;
}

export function getConnectionTypes(
	connections: Array<NodeConnectionType | INodeInputConfiguration | INodeOutputConfiguration>,
): NodeConnectionType[] {
	return connections
		.map((connection) => {
			if (typeof connection === 'string') {
				return connection;
			}
			return connection.type;
		})
		.filter((connection) => connection !== undefined);
}

export function getNodeInputs(
	workflow: Workflow,
	node: INode,
	nodeTypeData: INodeTypeDescription,
): Array<NodeConnectionType | INodeInputConfiguration> {
	if (Array.isArray(nodeTypeData?.inputs)) {
		return nodeTypeData.inputs;
	}

	// Calculate the outputs dynamically
	try {
		return (workflow.expression.getSimpleParameterValue(
			node,
			nodeTypeData.inputs,
			'internal',
			{},
		) || []) as NodeConnectionType[];
	} catch (e) {
		console.warn('Could not calculate inputs dynamically for node: ', node.name);
		return [];
	}
}

export function getNodeOutputs(
	workflow: Workflow,
	node: INode,
	nodeTypeData: INodeTypeDescription,
): Array<NodeConnectionType | INodeOutputConfiguration> {
	let outputs: Array<NodeConnectionType | INodeOutputConfiguration> = [];

	if (Array.isArray(nodeTypeData.outputs)) {
		outputs = nodeTypeData.outputs;
	} else {
		// Calculate the outputs dynamically
		try {
			const result = workflow.expression.getSimpleParameterValue(
				node,
				nodeTypeData.outputs,
				'internal',
				{},
			);
			outputs = Array.isArray(result)
				? (result as Array<NodeConnectionType | INodeOutputConfiguration>)
				: [];
		} catch (e) {
			console.warn('Could not calculate outputs dynamically for node: ', node.name);
		}
	}

	if (node.onError === 'continueErrorOutput') {
		// Copy the data to make sure that we do not change the data of the
		// node type and so change the displayNames for all nodes in the flow
		outputs = deepCopy(outputs);
		if (outputs.length === 1) {
			// Set the displayName to "Success"
			if (typeof outputs[0] === 'string') {
				outputs[0] = {
					type: outputs[0],
				};
			}
			outputs[0].displayName = 'Success';
		}
		return [
			...outputs,
			{
				category: 'error',
				type: NodeConnectionTypes.Main,
				displayName: 'Error',
			},
		];
	}

	return outputs;
}

/**
 * Returns all the parameter-issues of the node
 *
 * @param {INodeProperties[]} nodePropertiesArray The properties of the node
 * @param {INode} node The data of the node
 */
export function getNodeParametersIssues(
	nodePropertiesArray: INodeProperties[],
	node: INode,
	nodeTypeDescription: INodeTypeDescription | null,
	pinDataNodeNames?: string[],
): INodeIssues | null {
	const foundIssues: INodeIssues = {};
	let propertyIssues: INodeIssues;

	if (node.disabled === true || pinDataNodeNames?.includes(node.name)) {
		// Ignore issues on disabled and pindata nodes
		return null;
	}

	for (const nodeProperty of nodePropertiesArray) {
		propertyIssues = getParameterIssues(
			nodeProperty,
			node.parameters,
			'',
			node,
			nodeTypeDescription,
		);
		mergeIssues(foundIssues, propertyIssues);
	}

	if (Object.keys(foundIssues).length === 0) {
		return null;
	}

	return foundIssues;
}

/*
 * Validates resource locator node parameters based on validation ruled defined in each parameter mode
 */
const validateResourceLocatorParameter = (
	value: INodeParameterResourceLocator,
	parameterMode: INodePropertyMode,
): string[] => {
	const valueToValidate = value?.value?.toString() || '';
	if (valueToValidate.startsWith('=')) {
		return [];
	}

	const validationErrors: string[] = [];
	// Each mode can have multiple validations specified
	if (parameterMode.validation) {
		for (const validation of parameterMode.validation) {
			if (validation && (validation as INodePropertyModeValidation).type === 'regex') {
				const regexValidation = validation as INodePropertyRegexValidation;
				const regex = new RegExp(`^${regexValidation.properties.regex}$`);

				if (!regex.test(valueToValidate)) {
					validationErrors.push(regexValidation.properties.errorMessage);
				}
			}
		}
	}

	return validationErrors;
};

/*
 * Validates resource mapper values based on service schema
 */
const validateResourceMapperParameter = (
	nodeProperties: INodeProperties,
	value: ResourceMapperValue,
	skipRequiredCheck = false,
): Record<string, string[]> => {
	// No issues to raise in automatic mapping mode, no user input to validate
	if (value.mappingMode === 'autoMapInputData') {
		return {};
	}

	const issues: Record<string, string[]> = {};
	let fieldWordSingular =
		nodeProperties.typeOptions?.resourceMapper?.fieldWords?.singular || 'Field';
	fieldWordSingular = fieldWordSingular.charAt(0).toUpperCase() + fieldWordSingular.slice(1);
	value.schema.forEach((field) => {
		const fieldValue = value.value ? value.value[field.id] : null;
		const key = `${nodeProperties.name}.${field.id}`;
		const fieldErrors: string[] = [];
		if (field.required && !skipRequiredCheck) {
			if (value.value === null || fieldValue === undefined) {
				const error = `${fieldWordSingular} "${field.id}" is required`;
				fieldErrors.push(error);
			}
		}
		if (!fieldValue?.toString().startsWith('=') && field.type) {
			const validationResult = validateFieldType(field.id, fieldValue, field.type, {
				valueOptions: field.options,
			});
			if (!validationResult.valid && validationResult.errorMessage) {
				fieldErrors.push(validationResult.errorMessage);
			}
		}
		if (fieldErrors.length > 0) {
			issues[key] = fieldErrors;
		}
	});
	return issues;
};

const validateParameter = (
	nodeProperties: INodeProperties,
	value: GenericValue,
	type: FieldType,
): string | undefined => {
	const nodeName = nodeProperties.name;
	const options = type === 'options' ? nodeProperties.options : undefined;

	if (!value?.toString().startsWith('=')) {
		const validationResult = validateFieldType(nodeName, value, type, {
			valueOptions: options as INodePropertyOptions[],
		});

		if (!validationResult.valid && validationResult.errorMessage) {
			return validationResult.errorMessage;
		}
	}

	return undefined;
};

/**
 * Adds an issue if the parameter is not defined
 *
 * @param {INodeIssues} foundIssues The already found issues
 * @param {INodeProperties} nodeProperties The properties of the node
 * @param {NodeParameterValue} value The value of the parameter
 */
function addToIssuesIfMissing(
	foundIssues: INodeIssues,
	nodeProperties: INodeProperties,
	value: NodeParameterValue | INodeParameterResourceLocator,
) {
	// TODO: Check what it really has when undefined
	if (
		(nodeProperties.type === 'string' && (value === '' || value === undefined)) ||
		(nodeProperties.type === 'multiOptions' && Array.isArray(value) && value.length === 0) ||
		(nodeProperties.type === 'dateTime' && (value === '' || value === undefined)) ||
		(nodeProperties.type === 'options' && (value === '' || value === undefined)) ||
		((nodeProperties.type === 'resourceLocator' || nodeProperties.type === 'workflowSelector') &&
			!isValidResourceLocatorParameterValue(value as INodeParameterResourceLocator))
	) {
		// Parameter is required but empty
		if (foundIssues.parameters === undefined) {
			foundIssues.parameters = {};
		}
		if (foundIssues.parameters[nodeProperties.name] === undefined) {
			foundIssues.parameters[nodeProperties.name] = [];
		}

		foundIssues.parameters[nodeProperties.name].push(
			`Parameter "${nodeProperties.displayName}" is required.`,
		);
	}
}

/**
 * Returns the parameter value
 *
 * @param {INodeParameters} nodeValues The values of the node
 * @param {string} parameterName The name of the parameter to return the value of
 * @param {string} path The path to the properties
 */
export function getParameterValueByPath(
	nodeValues: INodeParameters,
	parameterName: string,
	path: string,
) {
	return get(nodeValues, path ? `${path}.${parameterName}` : parameterName);
}

function isINodeParameterResourceLocator(value: unknown): value is INodeParameterResourceLocator {
	return typeof value === 'object' && value !== null && 'value' in value && 'mode' in value;
}

/**
 * Returns all the issues with the given node-values
 *
 * @param {INodeProperties} nodeProperties The properties of the node
 * @param {INodeParameters} nodeValues The values of the node
 * @param {string} path The path to the properties
 */
// eslint-disable-next-line complexity
export function getParameterIssues(
	nodeProperties: INodeProperties,
	nodeValues: INodeParameters,
	path: string,
	node: INode,
	nodeTypeDescription: INodeTypeDescription | null,
): INodeIssues {
	const foundIssues: INodeIssues = {};
	const isDisplayed = displayParameterPath(
		nodeValues,
		nodeProperties,
		path,
		node,
		nodeTypeDescription,
	);
	if (nodeProperties.required === true) {
		if (isDisplayed) {
			const value = getParameterValueByPath(nodeValues, nodeProperties.name, path);

			if (
				// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
				nodeProperties.typeOptions !== undefined &&
				nodeProperties.typeOptions.multipleValues !== undefined
			) {
				// Multiple can be set so will be an array
				if (Array.isArray(value)) {
					for (const singleValue of value as NodeParameterValue[]) {
						addToIssuesIfMissing(foundIssues, nodeProperties, singleValue);
					}
				}
			} else {
				// Only one can be set so will be a single value
				addToIssuesIfMissing(foundIssues, nodeProperties, value as NodeParameterValue);
			}
		}
	}

	if (
		(nodeProperties.type === 'resourceLocator' || nodeProperties.type === 'workflowSelector') &&
		isDisplayed
	) {
		const value = getParameterValueByPath(nodeValues, nodeProperties.name, path);
		if (isINodeParameterResourceLocator(value)) {
			const mode = nodeProperties.modes?.find((option) => option.name === value.mode);
			if (mode) {
				const errors = validateResourceLocatorParameter(value, mode);
				errors.forEach((error) => {
					if (foundIssues.parameters === undefined) {
						foundIssues.parameters = {};
					}
					if (foundIssues.parameters[nodeProperties.name] === undefined) {
						foundIssues.parameters[nodeProperties.name] = [];
					}

					foundIssues.parameters[nodeProperties.name].push(error);
				});
			}
		}
	} else if (nodeProperties.type === 'resourceMapper' && isDisplayed) {
		const skipRequiredCheck = nodeProperties.typeOptions?.resourceMapper?.mode !== 'add';
		const value = getParameterValueByPath(nodeValues, nodeProperties.name, path);
		if (isResourceMapperValue(value)) {
			const issues = validateResourceMapperParameter(nodeProperties, value, skipRequiredCheck);
			if (Object.keys(issues).length > 0) {
				if (foundIssues.parameters === undefined) {
					foundIssues.parameters = {};
				}
				if (foundIssues.parameters[nodeProperties.name] === undefined) {
					foundIssues.parameters[nodeProperties.name] = [];
				}
				foundIssues.parameters = { ...foundIssues.parameters, ...issues };
			}
		}
	} else if (nodeProperties.type === 'filter' && isDisplayed) {
		const value = getParameterValueByPath(nodeValues, nodeProperties.name, path);
		if (isFilterValue(value)) {
			const issues = validateFilterParameter(nodeProperties, value);
			if (Object.keys(issues).length > 0) {
				foundIssues.parameters = { ...foundIssues.parameters, ...issues };
			}
		}
	} else if (nodeProperties.validateType) {
		const value = getParameterValueByPath(nodeValues, nodeProperties.name, path);
		const error = validateParameter(nodeProperties, value, nodeProperties.validateType);
		if (error) {
			if (foundIssues.parameters === undefined) {
				foundIssues.parameters = {};
			}
			if (foundIssues.parameters[nodeProperties.name] === undefined) {
				foundIssues.parameters[nodeProperties.name] = [];
			}

			foundIssues.parameters[nodeProperties.name].push(error);
		}
	}

	// Check if there are any child parameters
	if (nodeProperties.options === undefined) {
		// There are none so nothing else to check
		return foundIssues;
	}

	// Check the child parameters

	// Important:
	// Checks the child properties only if the property is defined on current level.
	// That means that the required flag works only for the current level only. If
	// it is set on a lower level it means that the property is only required in case
	// the parent property got set.

	let basePath = path ? `${path}.` : '';

	const checkChildNodeProperties: Array<{
		basePath: string;
		data: INodeProperties;
	}> = [];

	// Collect all the properties to check
	if (nodeProperties.type === 'collection') {
		for (const option of nodeProperties.options) {
			checkChildNodeProperties.push({
				basePath,
				data: option as INodeProperties,
			});
		}
	} else if (nodeProperties.type === 'fixedCollection' && isDisplayed) {
		basePath = basePath ? `${basePath}.` : `${nodeProperties.name}.`;

		let propertyOptions: INodePropertyCollection;
		for (propertyOptions of nodeProperties.options as INodePropertyCollection[]) {
			// Check if the option got set and if not skip it
			const value = getParameterValueByPath(
				nodeValues,
				propertyOptions.name,
				basePath.slice(0, -1),
			);

			// Validate allowed field counts
			const valueArray = Array.isArray(value) ? value : [];
			const { minRequiredFields, maxAllowedFields } = nodeProperties.typeOptions ?? {};
			let error = '';

			if (minRequiredFields && valueArray.length < minRequiredFields) {
				error = `At least ${minRequiredFields} ${minRequiredFields === 1 ? 'field is' : 'fields are'} required.`;
			}
			if (maxAllowedFields && valueArray.length > maxAllowedFields) {
				error = `At most ${maxAllowedFields} ${maxAllowedFields === 1 ? 'field is' : 'fields are'} allowed.`;
			}
			if (error) {
				foundIssues.parameters ??= {};
				foundIssues.parameters[nodeProperties.name] ??= [];
				foundIssues.parameters[nodeProperties.name].push(error);
			}

			if (value === undefined) {
				continue;
			}

			if (
				// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
				nodeProperties.typeOptions !== undefined &&
				nodeProperties.typeOptions.multipleValues !== undefined
			) {
				// Multiple can be set so will be an array of objects
				if (Array.isArray(value)) {
					for (let i = 0; i < (value as INodeParameters[]).length; i++) {
						for (const option of propertyOptions.values) {
							checkChildNodeProperties.push({
								basePath: `${basePath}${propertyOptions.name}[${i}]`,
								data: option,
							});
						}
					}
				}
			} else {
				// Only one can be set so will be an object
				for (const option of propertyOptions.values) {
					checkChildNodeProperties.push({
						basePath: basePath + propertyOptions.name,
						data: option,
					});
				}
			}
		}
	} else {
		// For all other types there is nothing to check so return
		return foundIssues;
	}

	let propertyIssues;

	for (const optionData of checkChildNodeProperties) {
		propertyIssues = getParameterIssues(
			optionData.data,
			nodeValues,
			optionData.basePath,
			node,
			nodeTypeDescription,
		);
		mergeIssues(foundIssues, propertyIssues);
	}

	return foundIssues;
}

/**
 * Merges multiple NodeIssues together
 *
 * @param {INodeIssues} destination The issues to merge into
 * @param {(INodeIssues | null)} source The issues to merge
 */
export function mergeIssues(destination: INodeIssues, source: INodeIssues | null) {
	if (source === null) {
		// Nothing to merge
		return;
	}

	if (source.execution === true) {
		destination.execution = true;
	}

	const objectProperties = ['parameters', 'credentials'];

	let destinationProperty: INodeIssueObjectProperty;
	for (const propertyName of objectProperties) {
		if (source[propertyName] !== undefined) {
			if (destination[propertyName] === undefined) {
				destination[propertyName] = {};
			}

			let parameterName: string;
			for (parameterName of Object.keys(source[propertyName] as INodeIssueObjectProperty)) {
				destinationProperty = destination[propertyName] as INodeIssueObjectProperty;
				if (destinationProperty[parameterName] === undefined) {
					destinationProperty[parameterName] = [];
				}
				destinationProperty[parameterName].push.apply(
					destinationProperty[parameterName],
					(source[propertyName] as INodeIssueObjectProperty)[parameterName],
				);
			}
		}
	}

	if (source.typeUnknown === true) {
		destination.typeUnknown = true;
	}
}

/**
 * Merges the given node properties
 */
export function mergeNodeProperties(
	mainProperties: INodeProperties[],
	addProperties: INodeProperties[],
): void {
	let existingIndex: number;
	for (const property of addProperties) {
		if (property.doNotInherit) continue;

		existingIndex = mainProperties.findIndex((element) => element.name === property.name);

		if (existingIndex === -1) {
			// Property does not exist yet, so add
			mainProperties.push(property);
		} else {
			// Property exists already, so overwrite
			mainProperties[existingIndex] = property;
		}
	}
}

export function getVersionedNodeType(
	object: IVersionedNodeType | INodeType,
	version?: number,
): INodeType {
	if ('nodeVersions' in object) {
		return object.getNodeType(version);
	}
	return object;
}

export function isTriggerNode(nodeTypeData: INodeTypeDescription) {
	return nodeTypeData.group.includes('trigger');
}

export function isExecutable(workflow: Workflow, node: INode, nodeTypeData: INodeTypeDescription) {
	const outputs = getNodeOutputs(workflow, node, nodeTypeData);
	const outputNames = getConnectionTypes(outputs);
	return (
		outputNames.includes(NodeConnectionTypes.Main) ||
		outputNames.includes(NodeConnectionTypes.AiTool) ||
		isTriggerNode(nodeTypeData)
	);
}

export function isNodeWithWorkflowSelector(node: INode) {
	return [EXECUTE_WORKFLOW_NODE_TYPE, WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE].includes(node.type);
}

/**
 * @returns An object containing either the resolved operation's action if available,
 * else the resource and operation if both exist.
 * If neither can be resolved, returns an empty object.
 */
function resolveResourceAndOperation(
	nodeParameters: INodeParameters,
	nodeTypeDescription: INodeTypeDescription,
) {
	if (nodeTypeDescription.name === 'n8n-nodes-base.code') {
		const language = nodeParameters.language as string;
		const langProp = nodeTypeDescription.properties.find((p) => p.name === 'language');
		if (langProp?.options && isINodePropertyOptionsList(langProp.options)) {
			const found = langProp.options.find((o) => o.value === language);
			if (found?.action) return { action: found.action };
		}
	}

	const resource = nodeParameters.resource as string;
	const operation = nodeParameters.operation as string;
	const nodeTypeOperation = nodeTypeDescription.properties.find(
		(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes(resource),
	);

	if (nodeTypeOperation?.options && isINodePropertyOptionsList(nodeTypeOperation.options)) {
		const foundOperation = nodeTypeOperation.options.find((option) => option.value === operation);
		if (foundOperation?.action) {
			return { action: foundOperation.action };
		}
	}

	if (resource && operation) {
		return { operation, resource };
	} else {
		return {};
	}
}

/**
 * Generates a human-readable description for a node based on its parameters and type definition.
 *
 * This function creates a descriptive string that represents what the node does,
 * based on its resource, operation, and node type information. The description is
 * formatted in one of the following ways:
 *
 * 1. "{action} in {displayName}" if the operation has a defined action
 * 2. "{operation} {resource} in {displayName}" if resource and operation exist
 * 3. The node type's description field as a fallback
 */
export function makeDescription(
	nodeParameters: INodeParameters,
	nodeTypeDescription: INodeTypeDescription,
): string {
	const { action, operation, resource } = resolveResourceAndOperation(
		nodeParameters,
		nodeTypeDescription,
	);

	if (action) {
		return `${action} in ${nodeTypeDescription.defaults.name}`;
	}

	if (resource && operation) {
		return `${operation} ${resource} in ${nodeTypeDescription.defaults.name}`;
	}

	return nodeTypeDescription.description;
}

export function isTool(
	nodeTypeDescription: INodeTypeDescription,
	parameters: INodeParameters,
): boolean {
	// Check if node is a vector store in retrieve-as-tool mode
	if (nodeTypeDescription.name.includes('vectorStore')) {
		const mode = parameters.mode;
		return mode === 'retrieve-as-tool';
	}

	// Check for other tool nodes
	if (Array.isArray(nodeTypeDescription.outputs)) {
		// Handle static outputs (array case)
		for (const output of nodeTypeDescription.outputs) {
			if (typeof output === 'string') {
				return output === NodeConnectionTypes.AiTool;
			} else if (output?.type && output.type === NodeConnectionTypes.AiTool) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Generates a resource and operation aware node name.
 *
 * Appends `in {nodeTypeDisplayName}` if nodeType is a tool
 *
 * 1. "{action}" if the operation has a defined action
 * 2. "{operation} {resource}" if resource and operation exist
 * 3. The node type's defaults.name field or displayName as a fallback
 */
export function makeNodeName(
	nodeParameters: INodeParameters,
	nodeTypeDescription: INodeTypeDescription,
): string {
	const { action, operation, resource } = resolveResourceAndOperation(
		nodeParameters,
		nodeTypeDescription,
	);

	const postfix = isTool(nodeTypeDescription, nodeParameters)
		? ` in ${nodeTypeDescription.defaults.name}`
		: '';

	if (action) {
		return `${action}${postfix}`;
	}

	if (resource && operation) {
		const operationProper = operation[0].toUpperCase() + operation.slice(1);
		return `${operationProper} ${resource}${postfix}`;
	}

	return nodeTypeDescription.defaults.name ?? nodeTypeDescription.displayName;
}

/**
 * Returns true if the node name is of format `<defaultNodeName>\d*` , which includes auto-renamed nodes
 */
export function isDefaultNodeName(
	name: string,
	nodeType: INodeTypeDescription,
	parameters: INodeParameters,
): boolean {
	const currentDefaultName = makeNodeName(parameters, nodeType);

	return name.startsWith(currentDefaultName) && /^\d*$/.test(name.slice(currentDefaultName.length));
}

/**
 * Determines whether a tool description should be updated and returns the new description if needed.
 * Returns undefined if no update is needed.
 */

export const getUpdatedToolDescription = (
	currentNodeType: INodeTypeDescription | null,
	newParameters: INodeParameters | null,
	currentParameters?: INodeParameters,
) => {
	if (!currentNodeType) return;

	if (newParameters?.descriptionType === 'manual' && currentParameters) {
		const previousDescription = makeDescription(currentParameters, currentNodeType);
		const newDescription = makeDescription(newParameters, currentNodeType);

		if (
			newParameters.toolDescription === previousDescription ||
			!newParameters.toolDescription?.toString().trim() ||
			newParameters.toolDescription === currentNodeType.description
		) {
			return newDescription;
		}
	}

	return;
};

/**
 * Generates a tool description for a given node based on its parameters and type.
 */
export function getToolDescriptionForNode(node: INode, nodeType: INodeType): string {
	let toolDescription;
	if (
		node.parameters.descriptionType === 'auto' ||
		!node?.parameters.toolDescription?.toString().trim()
	) {
		toolDescription = makeDescription(node.parameters, nodeType.description);
	} else if (node?.parameters.toolDescription) {
		toolDescription = node.parameters.toolDescription;
	} else {
		toolDescription = nodeType.description.description;
	}
	return toolDescription as string;
}

/**
 * Attempts to retrieve the ID of a subworkflow from a execute workflow node.
 */
export function getSubworkflowId(node: INode): string | undefined {
	if (isNodeWithWorkflowSelector(node) && isResourceLocatorValue(node.parameters.workflowId)) {
		return node.parameters.workflowId.value as string;
	}
	return;
}
