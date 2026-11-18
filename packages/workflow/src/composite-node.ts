import { UserError } from './errors';
import { isExpression } from './expressions/expression-helpers';
import type {
	IConnection,
	IConnections,
	INode,
	INodeCredentials,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	NodeParameterValueType,
} from './interfaces';
import { checkConditions, getNodeParameters } from './node-helpers';

/**
 * A composite node is a node type whose implementation is a small workflow of
 * other nodes. It never runs itself. Before engine v2 converts a workflow, the
 * composite is expanded into its inner nodes, which run as ordinary steps.
 *
 * The expansion puts three kinds of nodes in place of the composite:
 * - one entry node, which resolves the composite's input-context parameters
 *   for each item, in the context of the item that entered the composite
 * - the inner nodes that the definition adds
 * - one exit node, which has the composite's name and settings, joins the
 *   inner branches and maps them to the composite's outputs
 */

export const COMPOSITE_ENTRY_NODE_TYPE = 'n8n-nodes-base.compositeEntry';
export const COMPOSITE_EXIT_NODE_TYPE = 'n8n-nodes-base.compositeExit';

/** Engine v2 accepts input slots 0 to 100 on one node. */
export const COMPOSITE_MAX_EXIT_INPUTS = 101;

/** Joins a composite's name and an inner step's key into the inner node's name. */
export const COMPOSITE_NAME_SEPARATOR = ' › ';

const LAYOUT_COLUMN_WIDTH = 240;
const LAYOUT_ROW_HEIGHT = 200;

export type CompositeExitSpec =
	| { output: number }
	/** `{index}` in the message is replaced with the 1-based position of the input in the exit. */
	| { error: string };

/** The layout of one exit, as the exit node reads it. */
export type CompositeExitLayout = CompositeExitSpec & { inputs: number[] };

export interface CompositeNodeHandle {
	readonly name: string;
	output(index: number): CompositeOutputHandle;
}

export interface CompositeOutputHandle {
	readonly node: CompositeNodeHandle;
	readonly index: number;
}

export interface CompositeExitHandle {
	readonly kind: 'exit';
}

export interface CompositeInnerNodeSpec {
	type: string;
	typeVersion: number;
	parameters: INodeParameters;
	credentials?: INodeCredentials;
	continueOnFail?: boolean;
	/**
	 * Where to draw the node when the user looks inside the composite. The entry is
	 * at column 0, row 0. Without a cell for every inner node, the nodes are drawn
	 * in layers from the entry.
	 */
	cell?: CompositeLayoutCell;
}

export interface CompositeLayoutCell {
	column: number;
	row: number;
}

export interface CompositeBuilder {
	/** The composite node as the user placed it. */
	readonly node: INode;
	/** The node that receives the composite's input items. */
	readonly entry: CompositeNodeHandle;
	/**
	 * A parameter value that decides the shape of the inner graph. Throws when the
	 * user set it with an expression, because the expansion runs before any item exists.
	 */
	literal<T extends NodeParameterValueType>(name: string): T;
	/**
	 * Parameters to evaluate against the item that entered the composite. Every
	 * expression in them is resolved by the entry node, and the returned copy reads
	 * the result from there. Fixed values are copied as they are.
	 */
	inputParameters(names: string[]): INodeParameters;
	/**
	 * One input-context parameter as JavaScript, to use inside an inner node's
	 * expression. A fixed value becomes a literal.
	 */
	inputExpression(name: string): string;
	/**
	 * A parameter to evaluate where the inner node runs, copied as it is. Use it for
	 * values such as conditions on a response.
	 */
	innerParameter(name: string): NodeParameterValueType;
	credentials(): INodeCredentials | undefined;
	addNode(key: string, spec: CompositeInnerNodeSpec): CompositeNodeHandle;
	exit(spec: CompositeExitSpec): CompositeExitHandle;
	/** Each connection into an exit takes a new input of the exit node. */
	connect(
		from: CompositeNodeHandle | CompositeOutputHandle,
		to: CompositeNodeHandle | CompositeExitHandle,
	): void;
}

export interface CompositeDefinition {
	expand(builder: CompositeBuilder): void;
}

export interface CompositeNodeType extends INodeType {
	composite: CompositeDefinition;
}

export function isCompositeNodeType(nodeType: INodeType): nodeType is CompositeNodeType {
	if (!('composite' in nodeType)) return false;
	const { composite } = nodeType;
	return typeof composite === 'object' && composite !== null && 'expand' in composite;
}

export interface CompositeScope {
	/** The id of the composite node that the inner node belongs to. */
	id: string;
	/** The name of the composite node that the inner node belongs to. */
	name: string;
}

export interface ExpandedWorkflow {
	nodes: INode[];
	connections: IConnections;
	/** The composite each inner node belongs to, by inner node name. Includes the entry and the exit. */
	scopes: Map<string, CompositeScope>;
}

export function compositeInnerNodeName(compositeName: string, key: string): string {
	return `${compositeName}${COMPOSITE_NAME_SEPARATOR}${key}`;
}

/**
 * Takes the properties of an inner node, for a composite to show as its own.
 * Removes the properties that the inner node's version hides, and the version
 * conditions, because the composite has a version of its own.
 */
export function exposeProperties(
	properties: INodeProperties[],
	innerVersion: number,
	{ exclude = [] }: { exclude?: string[] } = {},
): INodeProperties[] {
	const excluded = new Set(exclude);
	return properties
		.filter((property) => !excluded.has(property.name))
		.flatMap((property) => resolveVersionConditions(property, innerVersion));
}

function resolveVersionConditions(property: INodeProperties, version: number): INodeProperties[] {
	const show = property.displayOptions?.show?.['@version'];
	const hide = property.displayOptions?.hide?.['@version'];
	if (show && !checkConditions(show, [version])) return [];
	if (hide && checkConditions(hide, [version])) return [];

	const copy: INodeProperties = { ...property };
	if (property.displayOptions) {
		const { show: showRest, hide: hideRest } = property.displayOptions;
		const displayOptions = { ...property.displayOptions };
		if (showRest) {
			const { '@version': _, ...rest } = showRest;
			displayOptions.show = rest;
		}
		if (hideRest) {
			const { '@version': _, ...rest } = hideRest;
			displayOptions.hide = rest;
		}
		copy.displayOptions = displayOptions;
	}

	if (Array.isArray(property.options)) {
		const options: NonNullable<INodeProperties['options']> = [];
		for (const option of property.options) {
			if ('type' in option) {
				options.push(...resolveVersionConditions(option, version));
			} else if ('values' in option) {
				options.push({
					...option,
					values: option.values.flatMap((value) => resolveVersionConditions(value, version)),
				});
			} else {
				options.push(option);
			}
		}
		copy.options = options;
	}

	return [copy];
}

class Expansion implements CompositeBuilder {
	readonly entry: CompositeNodeHandle;

	readonly nodes: INode[] = [];

	readonly connections: Array<{ from: string; output: number; to: string; input: number }> = [];

	readonly exits: Array<CompositeExitLayout & { handle: CompositeExitHandle }> = [];

	private readonly entryValues: Array<{ name: string; value: string }> = [];

	private exitInputCount = 0;

	private readonly withDefaults: INodeParameters;

	private readonly entryName: string;

	private readonly cells = new Map<string, CompositeLayoutCell>();

	private exitPosition: [number, number];

	constructor(
		readonly node: INode,
		description: INodeTypeDescription,
	) {
		this.withDefaults =
			getNodeParameters(description.properties, node.parameters, true, false, node, description) ??
			{};
		this.entryName = compositeInnerNodeName(node.name, 'entry');
		this.entry = this.handle(this.entryName);
		this.exitPosition = node.position;

		// Exit input 0 always carries the entry's items and the exit ignores them.
		// Engine v2 fills an empty input 0 with one empty item, so no branch can use it.
		this.connections.push({ from: this.entryName, output: 0, to: node.name, input: 0 });
		this.exitInputCount = 1;
	}

	literal<T extends NodeParameterValueType>(name: string): T {
		const value = this.withDefaults[name];
		if (isExpression(value)) {
			throw new UserError(
				`Node "${this.node.name}" sets "${name}" with an expression. This value decides the steps the node runs, so it must be fixed.`,
			);
		}
		return value as T;
	}

	inputParameters(names: string[]): INodeParameters {
		const picked: INodeParameters = {};
		for (const name of names) {
			if (name in this.node.parameters) {
				picked[name] = this.redirectExpressions(
					this.node.parameters[name],
				) as INodeParameters[string];
			}
		}
		return picked;
	}

	inputExpression(name: string): string {
		const value = this.withDefaults[name];
		return isExpression(value) ? this.entryReference(value) : JSON.stringify(value);
	}

	innerParameter(name: string): NodeParameterValueType {
		return this.withDefaults[name];
	}

	credentials(): INodeCredentials | undefined {
		return this.node.credentials;
	}

	addNode(key: string, spec: CompositeInnerNodeSpec): CompositeNodeHandle {
		const name = compositeInnerNodeName(this.node.name, key);
		if (this.nodes.some((existing) => existing.name === name)) {
			throw new UserError(`Composite node "${this.node.name}" adds "${key}" twice.`);
		}
		this.nodes.push({
			id: `${this.node.id}:${key}`,
			name,
			type: spec.type,
			typeVersion: spec.typeVersion,
			position: this.node.position,
			parameters: spec.parameters,
			...(spec.credentials ? { credentials: spec.credentials } : {}),
			...(spec.continueOnFail ? { continueOnFail: true } : {}),
		});
		if (spec.cell) this.cells.set(name, spec.cell);
		return this.handle(name);
	}

	exit(spec: CompositeExitSpec): CompositeExitHandle {
		const handle: CompositeExitHandle = { kind: 'exit' };
		this.exits.push({ ...spec, inputs: [], handle });
		return handle;
	}

	connect(
		from: CompositeNodeHandle | CompositeOutputHandle,
		to: CompositeNodeHandle | CompositeExitHandle,
	): void {
		const source = 'index' in from ? from : from.output(0);

		if ('kind' in to) {
			const exit = this.exits.find((candidate) => candidate.handle === to);
			if (!exit) throw new UserError(`Composite node "${this.node.name}" uses an unknown exit.`);
			if (this.exitInputCount >= COMPOSITE_MAX_EXIT_INPUTS) {
				throw new UserError(
					`Composite node "${this.node.name}" needs more than ${COMPOSITE_MAX_EXIT_INPUTS} exit inputs. Use fewer attempts.`,
				);
			}
			exit.inputs.push(this.exitInputCount);
			this.connections.push({
				from: source.node.name,
				output: source.index,
				to: this.node.name,
				input: this.exitInputCount,
			});
			this.exitInputCount += 1;
			return;
		}

		this.connections.push({ from: source.node.name, output: source.index, to: to.name, input: 0 });
	}

	/**
	 * Places the inner nodes and the exit around the composite's position, so the
	 * expansion reads as a workflow when the user looks inside the composite.
	 */
	applyLayout(): void {
		const cells = this.cells.size === this.nodes.length ? new Map(this.cells) : this.layeredCells();
		const [x, y] = this.node.position;
		const toPosition = ({ column, row }: CompositeLayoutCell): [number, number] => [
			x + column * LAYOUT_COLUMN_WIDTH,
			y + row * LAYOUT_ROW_HEIGHT,
		];

		for (const inner of this.nodes) {
			const cell = cells.get(inner.name);
			if (cell) inner.position = toPosition(cell);
		}

		const all = [...cells.values()];
		const lastColumn = Math.max(0, ...all.map((cell) => cell.column));
		const lastRow = Math.max(0, ...all.map((cell) => cell.row));
		this.exitPosition = toPosition({ column: lastColumn + 1, row: lastRow / 2 });
	}

	/** Puts each inner node one column after the furthest node that connects into it. */
	private layeredCells(): Map<string, CompositeLayoutCell> {
		const columns = new Map<string, number>([[this.entryName, 0]]);
		const innerNames = new Set(this.nodes.map((inner) => inner.name));
		// The inner graph has no cycles, so a pass for each node settles every column.
		for (let pass = 0; pass < this.nodes.length; pass++) {
			for (const { from, to } of this.connections) {
				const fromColumn = columns.get(from);
				if (fromColumn === undefined || !innerNames.has(to)) continue;
				columns.set(to, Math.max(columns.get(to) ?? 0, fromColumn + 1));
			}
		}

		const cells = new Map<string, CompositeLayoutCell>();
		const rowsUsed = new Map<number, number>();
		for (const inner of this.nodes) {
			const column = columns.get(inner.name) ?? 1;
			const row = rowsUsed.get(column) ?? 0;
			rowsUsed.set(column, row + 1);
			cells.set(inner.name, { column, row });
		}
		return cells;
	}

	entryNode(): INode {
		return {
			id: `${this.node.id}:entry`,
			name: this.entryName,
			type: COMPOSITE_ENTRY_NODE_TYPE,
			typeVersion: 1,
			position: this.node.position,
			parameters: { values: { value: this.entryValues } },
		};
	}

	exitNode(): INode {
		// The exit stands in for the composite, so it keeps the composite's id, name and settings.
		const { parameters: _, credentials: __, retryOnFail: ___, ...settings } = this.node;
		const layout: CompositeExitLayout[] = this.exits.map(({ handle: _handle, ...exit }) => exit);
		const outputCount = Math.max(
			1,
			...layout.map((exit) => ('output' in exit ? exit.output + 1 : 0)),
		);
		return {
			...settings,
			position: this.exitPosition,
			type: COMPOSITE_EXIT_NODE_TYPE,
			typeVersion: 1,
			parameters: {
				inputCount: this.exitInputCount,
				outputCount,
				layout: JSON.stringify(layout),
			},
		};
	}

	private handle(name: string): CompositeNodeHandle {
		const handle: CompositeNodeHandle = {
			name,
			output: (index: number) => ({ node: handle, index }),
		};
		return handle;
	}

	private entryReference(expression: string): string {
		// Inner nodes that repeat for each attempt share one resolved value.
		let key = this.entryValues.find((entry) => entry.value === expression)?.name;
		if (key === undefined) {
			key = `p${this.entryValues.length}`;
			this.entryValues.push({ name: key, value: expression });
		}
		return `$(${JSON.stringify(this.entryName)}).item.json[${JSON.stringify(key)}]`;
	}

	private redirectExpressions(value: unknown): unknown {
		if (isExpression(value)) return `={{ ${this.entryReference(value)} }}`;
		if (Array.isArray(value)) return value.map((item) => this.redirectExpressions(item));
		if (value !== null && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value).map(([key, entry]) => [key, this.redirectExpressions(entry)]),
			);
		}
		return value;
	}
}

/**
 * Replaces every composite node with its inner nodes. Connections into a
 * composite go to its entry node. Connections out of it leave from its exit
 * node, which keeps the composite's name, so they need no change.
 *
 * @param skip Names of composite nodes to leave as they are, for example pinned ones.
 */
export function expandComposites(
	workflow: { nodes: INode[]; connections: IConnections },
	nodeTypes: INodeTypes,
	{ skip = new Set<string>() }: { skip?: Set<string> } = {},
): ExpandedWorkflow {
	const scopes = new Map<string, CompositeScope>();
	const takenNames = new Set(workflow.nodes.map((node) => node.name));
	let nodes: INode[] = [];
	let connections: IConnections = structuredClone(workflow.connections);
	const entryNames = new Map<string, string>();

	for (const node of workflow.nodes) {
		const nodeType =
			node.disabled || skip.has(node.name) ? undefined : findNodeType(nodeTypes, node);
		if (!nodeType || !isCompositeNodeType(nodeType)) {
			nodes.push(node);
			continue;
		}

		const expansion = new Expansion(node, nodeType.description);
		nodeType.composite.expand(expansion);
		expansion.applyLayout();

		const entry = expansion.entryNode();
		const added = [entry, ...expansion.nodes, expansion.exitNode()];
		for (const inner of added) {
			if (inner.name !== node.name && takenNames.has(inner.name)) {
				throw new UserError(
					`Node "${node.name}" needs the name "${inner.name}" for one of its inner steps. Rename the other node.`,
				);
			}
			takenNames.add(inner.name);
			scopes.set(inner.name, { id: node.id, name: node.name });
		}
		nodes = nodes.concat(added);
		entryNames.set(node.name, entry.name);

		for (const connection of expansion.connections) {
			addConnection(connections, connection);
		}
	}

	if (entryNames.size > 0) {
		// Exits keep the composite's name, so their connections lead outside and are retargeted too.
		const innerSources = new Set(
			[...scopes.entries()].filter(([name, scope]) => name !== scope.name).map(([name]) => name),
		);
		connections = retargetToEntries(connections, entryNames, innerSources);
	}

	return { nodes, connections, scopes };
}

/**
 * Expands one composite node on its own, so the user can look inside it.
 * Returns `undefined` when the node is not a composite.
 */
export function expandCompositeNode(
	node: INode,
	nodeTypes: INodeTypes,
): ExpandedWorkflow | undefined {
	const nodeType = findNodeType(nodeTypes, node);
	if (!nodeType || !isCompositeNodeType(nodeType)) return undefined;
	return expandComposites({ nodes: [{ ...node, disabled: false }], connections: {} }, nodeTypes);
}

function findNodeType(nodeTypes: INodeTypes, node: INode): INodeType | undefined {
	try {
		return nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	} catch {
		// Unknown types are the converter's and the executor's to report.
		return undefined;
	}
}

function addConnection(
	connections: IConnections,
	{ from, output, to, input }: { from: string; output: number; to: string; input: number },
): void {
	connections[from] ??= {};
	const main = (connections[from].main ??= []);
	while (main.length <= output) main.push([]);
	(main[output] ??= []).push({ node: to, type: 'main', index: input });
}

/** Points every outside connection into a composite at the composite's entry node. */
function retargetToEntries(
	connections: IConnections,
	entryNames: Map<string, string>,
	innerSources: Set<string>,
): IConnections {
	for (const [source, byType] of Object.entries(connections)) {
		if (innerSources.has(source)) continue;
		for (const outputs of Object.values(byType)) {
			for (const slot of outputs) {
				slot?.forEach((connection: IConnection, index: number) => {
					const entryName = entryNames.get(connection.node);
					if (entryName !== undefined) slot[index] = { ...connection, node: entryName, index: 0 };
				});
			}
		}
	}
	return connections;
}
