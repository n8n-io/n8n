/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-return */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

/* eslint-disable prefer-spread */

import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import uniqBy from 'lodash/uniqBy';

import type {
	FieldType,
	IContextObject,
	IHttpRequestMethods,
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
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	NodeParameterValue,
	ResourceMapperValue,
	ConnectionTypes,
	INodeTypeDescription,
	INodeOutputConfiguration,
	INodeInputConfiguration,
	GenericValue,
	DisplayCondition,
} from './Interfaces';
import {
	isFilterValue,
	isResourceMapperValue,
	isValidResourceLocatorParameterValue,
} from './type-guards';
import { deepCopy } from './utils';

import type { Workflow } from './Workflow';
import { validateFilterParameter } from './NodeParameters/FilterParameter';
import { validateFieldType } from './TypeValidation';
import { ApplicationError } from './errors/application.error';

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

const commonPollingParameters: INodeProperties[] = [
	{
		displayName: 'Poll Times',
		name: 'pollTimes',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Poll Time',
		},
		default: { item: [{ mode: 'everyMinute' }] },
		description: 'Time at which polling should occur',
		placeholder: 'Add Poll Time',
		options: cronNodeOptions,
	},
];

const commonCORSParameters: INodeProperties[] = [
	{
		displayName: 'Allowed Origins (CORS)',
		name: 'allowedOrigins',
		type: 'string',
		default: '*',
		description:
			'Comma-separated list of URLs allowed for cross-origin non-preflight requests. Use * (default) to allow all origins.',
	},
];

/**
 * Apply special parameters which should be added to nodeTypes depending on their type or configuration
 */
export function applySpecialNodeParameters(nodeType: INodeType): void {
	const { properties, polling, supportsCORS } = nodeType.description;
	if (polling) {
		properties.unshift(...commonPollingParameters);
	}
	if (nodeType.webhook && supportsCORS) {
		const optionsProperty = properties.find(({ name }) => name === 'options');
		if (optionsProperty)
			optionsProperty.options = [
				...commonCORSParameters,
				...(optionsProperty.options as INodePropertyOptions[]),
			];
		else properties.push(...commonCORSParameters);
	}
}

const getPropertyValues = (
	nodeValues: INodeParameters,
	propertyName: string,
	node: Pick<INode, 'typeVersion'> | null,
	nodeValuesRoot: INodeParameters,
) => {
	let value;
	if (propertyName.charAt(0) === '/') {
		// Get the value from the root of the node
		value = get(nodeValuesRoot, propertyName.slice(1));
	} else if (propertyName === '@version') {
		value = node?.typeVersion || 0;
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
	parameter: INodeProperties | INodeCredentialDescription,
	node: Pick<INode, 'typeVersion'> | null, // Allow null as it does also get used by credentials and they do not have versioning yet
	nodeValuesRoot?: INodeParameters,
) {
	if (!parameter.displayOptions) {
		return true;
	}

	const { show, hide } = parameter.displayOptions;

	nodeValuesRoot = nodeValuesRoot || nodeValues;

	if (show) {
		// All the defined rules have to match to display parameter
		for (const propertyName of Object.keys(show)) {
			const values = getPropertyValues(nodeValues, propertyName, node, nodeValuesRoot);

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
			const values = getPropertyValues(nodeValues, propertyName, node, nodeValuesRoot);

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
	parameter: INodeProperties | INodeCredentialDescription,
	path: string,
	node: Pick<INode, 'typeVersion'> | null,
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

	return displayParameter(resolvedNodeValues, parameter, node, nodeValuesRoot);
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
 *
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
 *
 */
export function getParameterResolveOrder(
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

/**
 * Returns the node parameter values. Depending on the settings it either just returns the none
 * default values or it applies all the default values.
 *
 * @param {INodeProperties[]} nodePropertiesArray The properties which exist and their settings
 * @param {INodeParameters} nodeValues The node parameter data
 * @param {boolean} returnDefaults If default values get added or only none default values returned
 * @param {boolean} returnNoneDisplayed If also values which should not be displayed should be returned
 * @param {boolean} [onlySimpleTypes=false] If only simple types should be resolved
 * @param {boolean} [dataIsResolved=false] If nodeValues are already fully resolved (so that all default values got added already)
 * @param {INodeParameters} [nodeValuesRoot] The root node-parameter-data
 */
// eslint-disable-next-line complexity
export function getNodeParameters(
	nodePropertiesArray: INodeProperties[],
	nodeValues: INodeParameters | null,
	returnDefaults: boolean,
	returnNoneDisplayed: boolean,
	node: Pick<INode, 'typeVersion'> | null,
	onlySimpleTypes = false,
	dataIsResolved = false,
	nodeValuesRoot?: INodeParameters,
	parentType?: string,
	parameterDependencies?: IParameterDependencies,
): INodeParameters | null {
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
			true,
			true,
			nodeValuesRoot,
			parentType,
			parameterDependencies,
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
			!displayParameter(nodeValuesDisplayCheck, nodeProperties, node, nodeValuesRoot)
		) {
			if (!returnNoneDisplayed || !returnDefaults) {
				continue;
			}
		}

		if (!['collection', 'fixedCollection'].includes(nodeProperties.type)) {
			// Is a simple property so can be set as it is

			if (duplicateParameterNames.includes(nodeProperties.name)) {
				if (!displayParameter(nodeValuesDisplayCheck, nodeProperties, node, nodeValuesRoot)) {
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
					false,
					false,
					nodeValuesRoot,
					nodeProperties.type,
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
					// Iterate over all items as it contains multiple ones
					for (const nodeValue of (propertyValues as INodeParameters)[
						itemName
					] as INodeParameters[]) {
						nodePropertyOptions = nodeProperties.options!.find(
							// eslint-disable-next-line @typescript-eslint/no-shadow
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
							false,
							false,
							nodeValuesRoot,
							nodeProperties.type,
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
					// eslint-disable-next-line @typescript-eslint/no-shadow
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
							false,
							false,
							nodeValuesRoot,
							nodeProperties.type,
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
 * Returns all the webhooks which should be created for the give node
 */
export function getNodeWebhooks(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	ignoreRestartWebhooks = false,
): IWebhookData[] {
	if (node.disabled === true) {
		// Node is disabled so webhooks will also not be enabled
		return [];
	}

	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

	if (nodeType.description.webhooks === undefined) {
		// Node does not have any webhooks so return
		return [];
	}

	const workflowId = workflow.id || '__UNSAVED__';
	const mode = 'internal';

	const returnData: IWebhookData[] = [];
	for (const webhookDescription of nodeType.description.webhooks) {
		if (ignoreRestartWebhooks && webhookDescription.restartWebhook === true) {
			continue;
		}

		let nodeWebhookPath = workflow.expression.getSimpleParameterValue(
			node,
			webhookDescription.path,
			mode,
			{},
		);
		if (nodeWebhookPath === undefined) {
			// TODO: Use a proper logger
			console.error(
				`No webhook path could be found for node "${node.name}" in workflow "${workflowId}".`,
			);
			continue;
		}

		nodeWebhookPath = nodeWebhookPath.toString();

		if (nodeWebhookPath.startsWith('/')) {
			nodeWebhookPath = nodeWebhookPath.slice(1);
		}
		if (nodeWebhookPath.endsWith('/')) {
			nodeWebhookPath = nodeWebhookPath.slice(0, -1);
		}

		const isFullPath: boolean = workflow.expression.getSimpleParameterValue(
			node,
			webhookDescription.isFullPath,
			'internal',
			{},
			undefined,
			false,
		) as boolean;
		const restartWebhook: boolean = workflow.expression.getSimpleParameterValue(
			node,
			webhookDescription.restartWebhook,
			'internal',
			{},
			undefined,
			false,
		) as boolean;
		const path = getNodeWebhookPath(workflowId, node, nodeWebhookPath, isFullPath, restartWebhook);

		const webhookMethods = workflow.expression.getSimpleParameterValue(
			node,
			webhookDescription.httpMethod,
			mode,
			{},
			undefined,
			'GET',
		);

		if (webhookMethods === undefined) {
			// TODO: Use a proper logger
			console.error(
				`The webhook "${path}" for node "${node.name}" in workflow "${workflowId}" could not be added because the httpMethod is not defined.`,
			);
			continue;
		}

		let webhookId: string | undefined;
		if ((path.startsWith(':') || path.includes('/:')) && node.webhookId) {
			webhookId = node.webhookId;
		}

		String(webhookMethods)
			.split(',')
			.forEach((httpMethod) => {
				if (!httpMethod) return;
				returnData.push({
					httpMethod: httpMethod.trim() as IHttpRequestMethods,
					node: node.name,
					path,
					webhookDescription,
					workflowId,
					workflowExecuteAdditionalData: additionalData,
					webhookId,
				});
			});
	}

	return returnData;
}

/**
 * Returns the webhook path
 *
 */
export function getNodeWebhookPath(
	workflowId: string,
	node: INode,
	path: string,
	isFullPath?: boolean,
	restartWebhook?: boolean,
): string {
	let webhookPath = '';
	if (restartWebhook === true) {
		return path;
	}
	if (node.webhookId === undefined) {
		webhookPath = `${workflowId}/${encodeURIComponent(node.name.toLowerCase())}/${path}`;
	} else {
		if (isFullPath === true) {
			return path;
		}
		webhookPath = `${node.webhookId}/${path}`;
	}
	return webhookPath;
}

/**
 * Returns the webhook URL
 *
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
	connections: Array<ConnectionTypes | INodeInputConfiguration | INodeOutputConfiguration>,
): ConnectionTypes[] {
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
): Array<ConnectionTypes | INodeInputConfiguration> {
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
		) || []) as ConnectionTypes[];
	} catch (e) {
		console.warn('Could not calculate inputs dynamically for node: ', node.name);
		return [];
	}
}

export function getNodeOutputs(
	workflow: Workflow,
	node: INode,
	nodeTypeData: INodeTypeDescription,
): Array<ConnectionTypes | INodeOutputConfiguration> {
	let outputs: Array<ConnectionTypes | INodeOutputConfiguration> = [];

	if (Array.isArray(nodeTypeData.outputs)) {
		outputs = nodeTypeData.outputs;
	} else {
		// Calculate the outputs dynamically
		try {
			outputs = (workflow.expression.getSimpleParameterValue(
				node,
				nodeTypeData.outputs,
				'internal',
				{},
			) || []) as ConnectionTypes[];
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
				type: 'main',
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
	pinDataNodeNames?: string[],
): INodeIssues | null {
	const foundIssues: INodeIssues = {};
	let propertyIssues: INodeIssues;

	if (node.disabled === true || pinDataNodeNames?.includes(node.name)) {
		// Ignore issues on disabled and pindata nodes
		return null;
	}

	for (const nodeProperty of nodePropertiesArray) {
		propertyIssues = getParameterIssues(nodeProperty, node.parameters, '', node);
		mergeIssues(foundIssues, propertyIssues);
	}

	if (Object.keys(foundIssues).length === 0) {
		return null;
	}

	return foundIssues;
}

/**
 * Returns the issues of the node as string
 *
 * @param {INodeIssues} issues The issues of the node
 * @param {INode} node The node
 */
export function nodeIssuesToString(issues: INodeIssues, node?: INode): string[] {
	const nodeIssues = [];

	if (issues.execution !== undefined) {
		nodeIssues.push('Execution Error.');
	}

	const objectProperties = ['parameters', 'credentials', 'input'];

	let issueText: string;
	let parameterName: string;
	for (const propertyName of objectProperties) {
		if (issues[propertyName] !== undefined) {
			for (parameterName of Object.keys(issues[propertyName] as object)) {
				for (issueText of (issues[propertyName] as INodeIssueObjectProperty)[parameterName]) {
					nodeIssues.push(issueText);
				}
			}
		}
	}

	if (issues.typeUnknown !== undefined) {
		if (node !== undefined) {
			nodeIssues.push(`Node Type "${node.type}" is not known.`);
		} else {
			nodeIssues.push('Node Type is not known.');
		}
	}

	return nodeIssues;
}

/*
 * Validates resource locator node parameters based on validation ruled defined in each parameter mode
 *
 */
export const validateResourceLocatorParameter = (
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
 *
 */
export const validateResourceMapperParameter = (
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

export const validateParameter = (
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
export function addToIssuesIfMissing(
	foundIssues: INodeIssues,
	nodeProperties: INodeProperties,
	value: NodeParameterValue | INodeParameterResourceLocator,
) {
	// TODO: Check what it really has when undefined
	if (
		(nodeProperties.type === 'string' && (value === '' || value === undefined)) ||
		(nodeProperties.type === 'multiOptions' && Array.isArray(value) && value.length === 0) ||
		(nodeProperties.type === 'dateTime' && value === undefined) ||
		(nodeProperties.type === 'options' && (value === '' || value === undefined)) ||
		(nodeProperties.type === 'resourceLocator' &&
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
): INodeIssues {
	const foundIssues: INodeIssues = {};
	const isDisplayed = displayParameterPath(nodeValues, nodeProperties, path, node);
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

	if (nodeProperties.type === 'resourceLocator' && isDisplayed) {
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
	} else if (nodeProperties.type === 'fixedCollection') {
		basePath = basePath ? `${basePath}.` : `${nodeProperties.name}.`;

		let propertyOptions: INodePropertyCollection;
		for (propertyOptions of nodeProperties.options as INodePropertyCollection[]) {
			// Check if the option got set and if not skip it
			const value = getParameterValueByPath(
				nodeValues,
				propertyOptions.name,
				basePath.slice(0, -1),
			);
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
		propertyIssues = getParameterIssues(optionData.data, nodeValues, optionData.basePath, node);
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
 *
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

export function getVersionedNodeTypeAll(object: IVersionedNodeType | INodeType): INodeType[] {
	if ('nodeVersions' in object) {
		return uniqBy(
			Object.values(object.nodeVersions)
				.map((element) => {
					element.description.name = object.description.name;
					element.description.codex = object.description.codex;
					return element;
				})
				.reverse(),
			(node) => {
				const { version } = node.description;
				return Array.isArray(version) ? version.join(',') : version.toString();
			},
		);
	}
	return [object];
}

export function getCredentialsForNode(
	object: IVersionedNodeType | INodeType,
): INodeCredentialDescription[] {
	if ('nodeVersions' in object) {
		return uniqBy(
			Object.values(object.nodeVersions).flatMap(
				(version) => version.description.credentials ?? [],
			),
			'name',
		);
	}

	return object.description.credentials ?? [];
}
