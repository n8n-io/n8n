import { isExpression } from './expressions/expression-helpers';
import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	NodeOperationAnnotations,
} from './interfaces';
import { displayParameter, getNodeParameters } from './node-helpers';
import { isINodePropertyOptionsList } from './type-guards';

type Annotations = Partial<NodeOperationAnnotations>;

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

function dependsOnExpression(property: INodeProperties, values: INodeParameters): boolean {
	const { show = {}, hide = {} } = property.displayOptions ?? {};
	return [...Object.keys(show), ...Object.keys(hide)].some((key) =>
		isExpression(values[key.replace(/^\//, '')]),
	);
}

function propertyAnnotations(
	property: INodeProperties,
	values: INodeParameters,
	node: Pick<INode, 'typeVersion'>,
	nodeType: INodeTypeDescription,
): Annotations | undefined {
	const { options } = property;
	if (property.type !== 'options' || !isINodePropertyOptionsList(options)) return undefined;
	if (!options.some((option) => option.annotations)) return undefined;
	if (!displayParameter(values, property, node, nodeType)) return undefined;

	const value = values[property.name];
	const selected =
		isExpression(value) || dependsOnExpression(property, values)
			? undefined
			: options.find((option) => option.value === value);
	if (selected) return selected.annotations ?? {};

	return mergeAnnotations(
		options.map((option) => option.annotations ?? {}),
		true,
	);
}

export function resolveNodeAnnotations(
	nodeType: INodeTypeDescription,
	node: Pick<INode, 'parameters' | 'typeVersion'>,
): NodeOperationAnnotations {
	const values =
		getNodeParameters(nodeType.properties, node.parameters, true, false, node, nodeType) ?? {};
	const sources = nodeType.properties.flatMap((property) => {
		const annotations = propertyAnnotations(property, values, node, nodeType);
		return annotations ? [annotations] : [];
	});
	return mergeAnnotations([nodeType.annotations ?? {}, ...sources]);
}
