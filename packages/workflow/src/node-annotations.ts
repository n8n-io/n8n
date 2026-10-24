import { isExpression } from './expressions/expression-helpers';
import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	NodeOperationAnnotations,
} from './interfaces';
import { displayParameter, getNodeParameters } from './node-helpers';
import {
	isINodePropertiesList,
	isINodePropertyCollectionList,
	isINodePropertyOptionsList,
} from './type-guards';
import { isObject } from './utils';

type Annotations = Partial<NodeOperationAnnotations>;

interface ResolutionContext {
	node: Pick<INode, 'typeVersion'>;
	nodeType: INodeTypeDescription;
	root: INodeParameters;
}

export const READ_ONLY_ANNOTATIONS: NodeOperationAnnotations = {
	effect: 'read',
	destructive: false,
	idempotent: true,
};

function isPermissive(
	sources: Annotations[],
	field: keyof NodeOperationAnnotations,
	strict: boolean,
): boolean {
	const values = sources.map((source) => source[field]);
	const considered = strict ? values : values.filter((value) => value !== undefined);
	return (
		considered.length > 0 && considered.every((value) => value === READ_ONLY_ANNOTATIONS[field])
	);
}

function mergeAnnotations(sources: Annotations[], strict = false): NodeOperationAnnotations {
	return {
		effect: isPermissive(sources, 'effect', strict) ? 'read' : 'write',
		destructive: !isPermissive(sources, 'destructive', strict),
		idempotent: isPermissive(sources, 'idempotent', strict),
	};
}

const RESTRICTIVE_ANNOTATIONS = mergeAnnotations([]);

const isNodeParameters = (value: unknown): value is INodeParameters => isObject(value);

const toEntries = (value: unknown): INodeParameters[] =>
	(Array.isArray(value) ? value : [value]).filter(isNodeParameters);

function dependsOnExpression(
	property: INodeProperties,
	values: INodeParameters,
	root: INodeParameters,
): boolean {
	const { show = {}, hide = {} } = property.displayOptions ?? {};
	return [...Object.keys(show), ...Object.keys(hide)].some((key) =>
		isExpression(key.startsWith('/') ? root[key.slice(1)] : values[key]),
	);
}

function optionAnnotations(
	property: INodeProperties,
	values: INodeParameters,
	root: INodeParameters,
): Annotations[] {
	const { options } = property;
	if (!isINodePropertyOptionsList(options) || !options.some((option) => option.annotations)) {
		return [];
	}

	const value = values[property.name] ?? property.default;
	if (isExpression(value) || dependsOnExpression(property, values, root)) {
		return [
			mergeAnnotations(
				options.map((option) => option.annotations ?? {}),
				true,
			),
		];
	}

	const selectedValues = property.type === 'multiOptions' && Array.isArray(value) ? value : [value];
	return selectedValues.map((selectedValue) => {
		const selected = options.find((option) => option.value === selectedValue);
		return selected ? (selected.annotations ?? {}) : RESTRICTIVE_ANNOTATIONS;
	});
}

function collectAnnotations(
	properties: INodeProperties[],
	values: INodeParameters,
	context: ResolutionContext,
): Annotations[] {
	return properties.flatMap((property) => {
		if (!displayParameter(values, property, context.node, context.nodeType, context.root)) {
			return [];
		}

		const { options } = property;
		if (property.type === 'options' || property.type === 'multiOptions') {
			return optionAnnotations(property, values, context.root);
		}

		if (property.type === 'collection' && isINodePropertiesList(options)) {
			const [children = {}] = toEntries(values[property.name]);
			return collectAnnotations(options, children, context);
		}

		if (property.type === 'fixedCollection' && isINodePropertyCollectionList(options)) {
			const [groups = {}] = toEntries(values[property.name]);
			return options.flatMap((group) =>
				toEntries(groups[group.name]).flatMap((entry) =>
					collectAnnotations(group.values, entry, context),
				),
			);
		}

		return [];
	});
}

export function resolveNodeAnnotations(
	nodeType: INodeTypeDescription,
	node: Pick<INode, 'parameters' | 'typeVersion'>,
): NodeOperationAnnotations {
	const root =
		getNodeParameters(nodeType.properties, node.parameters, true, false, node, nodeType) ?? {};
	const sources = collectAnnotations(nodeType.properties, root, { node, nodeType, root });
	return mergeAnnotations([nodeType.annotations ?? {}, ...sources]);
}
