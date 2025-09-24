import type {
	IWorkflowBase,
	INode,
	IConnections,
	NodeConnectionType,
	INodeParameters,
} from '../interfaces';
import { WorkflowBuilderError } from './errors';
import type { ConnectionOptions, ConnectOptions } from './types/connections';
import type { SupportedNodeTypes, NodeParametersFor } from './types/factory';
import type { WorkflowSettings } from './types/workflow';
import { generateNodeId } from './utils/id-generator';
import { calculateNextPosition } from './utils/positioning';

/**
 * Internal state for the workflow factory
 */
interface WorkflowFactoryState {
	readonly nodes: Map<string, INode>;
	readonly connections: Map<string, Array<{ target: string; options: ConnectionOptions }>>;
	readonly settings: WorkflowSettings;
}

/**
 * Main workflow factory class implementing the builder pattern
 */
export class WorkflowFactory<TNodeNames extends string = never> {
	private readonly state: WorkflowFactoryState;
	private readonly nodeIdGenerator: () => string;

	private constructor(state?: Partial<WorkflowFactoryState>, nodeIdGenerator?: () => string) {
		this.state = {
			nodes: state?.nodes ?? new Map<string, INode>(),
			connections:
				state?.connections ??
				new Map<string, Array<{ target: string; options: ConnectionOptions }>>(),
			settings: { ...state?.settings },
		};
		this.nodeIdGenerator = nodeIdGenerator ?? generateNodeId;
	}

	/**
	 * Creates a new workflow factory instance
	 *
	 * @param settings - Optional workflow configuration settings
	 *
	 * @example
	 * ```typescript
	 * const factory = WorkflowFactory.create({
	 *   name: 'My Workflow',
	 *   active: true,
	 *   executionOrder: 'v1'
	 * });
	 * ```
	 */
	static create(settings?: WorkflowSettings, nodeIdGenerator?: () => string): WorkflowFactory {
		return new WorkflowFactory({ settings }, nodeIdGenerator);
	}

	/**
	 * Updates workflow settings and returns a new factory instance
	 *
	 * @param settings - Workflow settings to update
	 * @returns A new WorkflowFactory instance with updated settings
	 *
	 * @example
	 * ```typescript
	 * const factory = WorkflowFactory.create()
	 *   .withSettings({ name: 'Updated Workflow', active: true });
	 * ```
	 */
	withSettings(settings: WorkflowSettings): WorkflowFactory<TNodeNames> {
		const factory = this.clone();
		Object.assign(factory.state.settings, settings);
		return factory;
	}

	/**
	 * Adds a node to the workflow
	 *
	 * @param nodeType - The type of node to add (e.g., 'n8n-nodes-base.webhook')
	 * @param nodeName - Unique name for the node
	 * @param parameters - Optional node-specific parameters
	 *
	 * @example
	 * ```typescript
	 * const factory = WorkflowFactory.create()
	 *   .add('n8n-nodes-base.webhook', {
	 *     name: 'trigger',
	 *     httpMethod: 'POST',
	 *     path: 'webhook-endpoint'
	 *   })
	 *   .add('n8n-nodes-base.set', {
	 *     name: 'transform',
	 *     assignments: {
	 *       assignments: [{
	 *         id: 'timestamp',
	 *         name: 'processed_at',
	 *         value: '={{ new Date().toISOString() }}',
	 *         type: 'string'
	 *       }]
	 *     }
	 *   });
	 * ```
	 */
	add<T extends SupportedNodeTypes, TName extends string>(
		nodeType: T,
		parameters: NodeParametersFor<T> & { name: TName },
	): WorkflowFactory<TNodeNames | TName> {
		const { name: nodeName, ...parametersWithoutName } = parameters;

		// Check for duplicate node names
		if (this.state.nodes.has(nodeName)) {
			throw new WorkflowBuilderError(`Node with name '${nodeName}' already exists`);
		}

		const position = calculateNextPosition(this.state.nodes.size);

		const node: INode = {
			id: this.nodeIdGenerator(),
			name: nodeName,
			type: nodeType,
			typeVersion: this.getNodeTypeVersion(nodeType),
			position: [position.x, position.y],
			parameters: parametersWithoutName as INodeParameters,
		};

		// Create a new factory instance with the new node
		const factory = this.clone();

		// Add the new node
		factory.state.nodes.set(nodeName, node);

		return factory;
	}

	/**
	 * Connects two nodes in the workflow
	 *
	 * @param sourceNode - Name of the source node
	 * @param targetNode - Name of the target node
	 *
	 * @example
	 * ```typescript
	 * const factory = WorkflowFactory.create()
	 *   .add('n8n-nodes-base.webhook', { name: 'trigger' })
	 *   .add('n8n-nodes-base.set', { name: 'transform' })
	 *   .add('n8n-nodes-base.respondToWebhook', { name: 'response' })
	 *   .connect('trigger', 'transform')
	 *   .connect('transform', 'response');
	 * ```
	 */
	connect(sourceNode: TNodeNames, targetNode: TNodeNames): WorkflowFactory<TNodeNames>;

	/**
	 * Connects two nodes in the workflow using a connection options object
	 *
	 * @param connectOpts - Connection options including source, target, indexes and type
	 *
	 * @example
	 * ```typescript
	 * const factory = WorkflowFactory.create()
	 *   .add('n8n-nodes-base.webhook', { name: 'trigger' })
	 *   .add('n8n-nodes-base.set', { name: 'transform' })
	 *   .connect({
	 *     source: 'trigger',
	 *     target: 'transform',
	 *     sourceIndex: 0,
	 *     targetIndex: 0,
	 *     type: 'main'
	 *   });
	 * ```
	 */
	connect(connectOpts: ConnectOptions): WorkflowFactory<TNodeNames>;

	connect(
		sourceNodeOrOpts: TNodeNames | ConnectOptions,
		targetNode?: TNodeNames,
		connectionOptions: ConnectionOptions = {},
	): WorkflowFactory<TNodeNames> {
		let sourceNodeName: string;
		let targetNodeName: string;
		let options: ConnectionOptions;

		// Handle overloaded parameters
		if (typeof sourceNodeOrOpts === 'object' && 'source' in sourceNodeOrOpts) {
			// ConnectOptions overload
			const connectOpts = sourceNodeOrOpts;
			sourceNodeName = connectOpts.source;
			targetNodeName = connectOpts.target;
			options = {
				sourceIndex: connectOpts.sourceIndex,
				targetIndex: connectOpts.targetIndex,
				type: connectOpts.type,
			};
		} else {
			// Original overload
			sourceNodeName = sourceNodeOrOpts as string;
			targetNodeName = targetNode as string;
			options = connectionOptions;
		}

		// Validate that both nodes exist
		if (!this.state.nodes.has(sourceNodeName)) {
			throw new WorkflowBuilderError(`Source node '${sourceNodeName}' does not exist`);
		}
		if (!this.state.nodes.has(targetNodeName)) {
			throw new WorkflowBuilderError(`Target node '${targetNodeName}' does not exist`);
		}

		const factory = this.clone();

		// Add the new connection
		const existingConnections = factory.state.connections.get(sourceNodeName) ?? [];
		existingConnections.push({ target: targetNodeName, options });
		factory.state.connections.set(sourceNodeName, existingConnections);

		return factory;
	}

	/**
	 * Builds the final n8n workflow JSON
	 *
	 * @returns Complete IWorkflowBase object
	 *
	 * @example
	 * ```typescript
	 * const workflow = WorkflowFactory.create({
	 *   name: 'My API Workflow',
	 *   active: true
	 * })
	 *   .add('n8n-nodes-base.webhook', 'trigger', { httpMethod: 'POST' })
	 *   .add('n8n-nodes-base.respondToWebhook', 'response', { respondWith: 'json' })
	 *   .connect('trigger', 'response')
	 *   .build();
	 *
	 * // Save or use the workflow
	 * console.log(JSON.stringify(workflow, null, 2));
	 * ```
	 */
	build(): Omit<IWorkflowBase, 'id' | 'createdAt' | 'updatedAt'> {
		const nodesArray = Array.from(this.state.nodes.values());
		const connections = this.buildConnections();

		return {
			name: this.state.settings.name ?? 'Untitled Workflow',
			active: this.state.settings.active ?? true,
			isArchived: false,
			nodes: nodesArray,
			connections,
			settings: {
				executionOrder: this.state.settings.executionOrder ?? 'v1',
				saveDataErrorExecution: this.state.settings.saveDataErrorExecution,
				saveDataSuccessExecution: this.state.settings.saveDataSuccessExecution,
				saveManualExecutions: this.state.settings.saveManualExecutions,
				timezone: this.state.settings.timezone,
			},
		};
	}

	/**
	 * Gets current nodes for debugging and inspection
	 *
	 * @returns Readonly array of all nodes currently in the workflow
	 *
	 * @example
	 * ```typescript
	 * const factory = WorkflowFactory.create()
	 *   .add('n8n-nodes-base.webhook', 'trigger')
	 *   .add('n8n-nodes-base.set', 'transform');
	 *
	 * console.log('Node count:', factory.getNodes().length);
	 * console.log('Node names:', factory.getNodes().map(n => n.name));
	 * ```
	 */
	getNodes(): readonly INode[] {
		return Array.from(this.state.nodes.values());
	}

	/**
	 * Gets current connections for debugging and inspection
	 *
	 * @returns Readonly connections object showing all node relationships
	 *
	 * @example
	 * ```typescript
	 * const factory = WorkflowFactory.create()
	 *   .add('n8n-nodes-base.webhook', { name: 'trigger' })
	 *   .add('n8n-nodes-base.set', { name: 'transform' })
	 *   .connect('trigger', 'transform');
	 *
	 * const connections = factory.getConnections();
	 * console.log('Connections from trigger:', connections.trigger);
	 * ```
	 */
	getConnections(): Readonly<IConnections> {
		return this.buildConnections();
	}

	/**
	 * Creates a deep clone of the current factory instance
	 */
	private clone(): WorkflowFactory<TNodeNames> {
		const clonedState = structuredClone(this.state);

		return new WorkflowFactory(clonedState, this.nodeIdGenerator);
	}

	/**
	 * Gets the appropriate type version for a node type
	 */
	private getNodeTypeVersion(nodeType: SupportedNodeTypes): number {
		switch (nodeType) {
			case 'n8n-nodes-base.webhook':
				return 2;
			case 'n8n-nodes-base.set':
				return 3;
			case 'n8n-nodes-base.respondToWebhook':
				return 1;
			case 'n8n-nodes-base.code':
				return 2;
			case 'n8n-nodes-base.manualTrigger':
				return 1;
			default:
				return 1;
		}
	}

	/**
	 * Builds the n8n connections structure
	 */
	private buildConnections(): IConnections {
		const connections: IConnections = {};

		this.state.connections.forEach((nodeConnections, sourceNodeName) => {
			connections[sourceNodeName] = {};

			nodeConnections.forEach((connection) => {
				const connectionType: NodeConnectionType = connection.options.type ?? 'main';
				const sourceIndex = connection.options.sourceIndex ?? 0;
				const targetIndex = connection.options.targetIndex ?? 0;

				// Initialize the connection structure if it doesn't exist
				if (!connections[sourceNodeName][connectionType]) {
					connections[sourceNodeName][connectionType] = [];
				}

				// Ensure the array has enough slots
				while (connections[sourceNodeName][connectionType]?.length <= sourceIndex) {
					connections[sourceNodeName][connectionType]?.push([]);
				}

				// Add the connection
				connections[sourceNodeName][connectionType]?.[sourceIndex]?.push({
					node: connection.target,
					type: connectionType,
					index: targetIndex,
				});
			});
		});

		return connections;
	}
}
