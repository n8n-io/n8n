import { z } from 'zod';

/**
 * Workflow Structure Validation
 *
 * Single source of truth for validating workflow **structure** — the minimum
 * shape that the editor and runtime assume is always present and correctly
 * formed. Intentionally separate from activation/publish validation
 * (WorkflowValidationService) which checks semantic correctness (trigger
 * presence, known node types, credential issues, etc.).
 *
 * Lives in n8n-workflow so it can be shared by:
 *   - Backend: create/update/import reject malformed payloads (400)
 *   - Frontend: open path warns but still renders; import path blocks
 *
 * Validates:
 *   - Required node fields (name, type, position)
 *   - Position is a 2-number tuple
 *   - Connection entries have valid node/type/index
 *   - No duplicate node names
 *   - No duplicate node ids, where present
 *   - Connection source/target keys reference existing nodes
 *
 * Does NOT validate:
 *   - Whether a node type is installed
 *   - Node parameter correctness
 *   - Credential validity
 *   - Activation readiness
 *
 */

const workflowNodeStructureSchema = z
	.object({
		name: z.string().min(1),
		type: z.string().min(1),
		position: z.tuple([z.number(), z.number()]),
		parameters: z.record(z.string(), z.unknown()).optional(),
		id: z.string().optional(),
		typeVersion: z.number().optional(),
		disabled: z.boolean().optional(),
	})
	.passthrough();

const connectionEntrySchema = z
	.object({
		node: z.string().min(1),
		type: z.string().min(1),
		index: z.number().int().min(0),
	})
	.passthrough();

// Buckets can be null when a multi-output node has unused output slots.
// Matches NodeInputConnections type.
const connectionBucketSchema = z.array(connectionEntrySchema).nullable().optional();

const workflowConnectionsStructureSchema = z.record(
	z.string(),
	z.record(z.string(), z.array(connectionBucketSchema)),
);

const workflowStructureSchema = z.object({
	nodes: z.array(workflowNodeStructureSchema),
	connections: workflowConnectionsStructureSchema,
});

type WorkflowStructureData = z.infer<typeof workflowStructureSchema>;

type WorkflowStructureGraphIssueCode =
	| 'duplicate_node_name'
	| 'duplicate_node_id'
	| 'unknown_connection_source'
	| 'unknown_connection_target';

type WorkflowStructureGraphIssue = {
	code: WorkflowStructureGraphIssueCode;
	path: Array<string | number>;
	message: string;
};

export type WorkflowStructureIssue = z.ZodIssue | WorkflowStructureGraphIssue;

type WorkflowStructureValidationSuccess = {
	success: true;
	data: WorkflowStructureData;
};

type WorkflowStructureValidationFailure = {
	success: false;
	issues: WorkflowStructureIssue[];
};

export type WorkflowStructureValidationResult =
	| WorkflowStructureValidationSuccess
	| WorkflowStructureValidationFailure;

export const formatWorkflowStructureIssuePath = (path: Array<string | number>): string => {
	if (path.length === 0) return 'workflow';

	return path.reduce<string>((acc, segment) => {
		if (typeof segment === 'number') return `${acc}[${segment}]`;
		return acc ? `${acc}.${segment}` : segment;
	}, '');
};

const formatIssuesDescription = (issues: WorkflowStructureIssue[]): string =>
	issues
		.map(({ path, message }) => `${formatWorkflowStructureIssuePath(path)}: ${message}`)
		.join('\n');

export class WorkflowStructureValidationError extends Error {
	override name = 'WorkflowStructureValidationError';

	readonly description: string;

	constructor(readonly issues: WorkflowStructureIssue[]) {
		super('Invalid workflow structure');
		this.description = formatIssuesDescription(issues);
	}
}

export function safeParseWorkflowStructure(input: unknown): WorkflowStructureValidationResult {
	const parsed = workflowStructureSchema.safeParse(input);

	if (!parsed.success) {
		return {
			success: false,
			issues: parsed.error.issues,
		};
	}

	const { nodes, connections } = parsed.data;
	const issues: WorkflowStructureIssue[] = [];
	const nodeNames = new Set<string>();
	const nodeIds = new Set<string>();

	const rejectDuplicate = (
		seen: Set<string>,
		value: string,
		issue: WorkflowStructureGraphIssue,
	) => {
		if (seen.has(value)) issues.push(issue);
		else seen.add(value);
	};

	for (const [index, node] of nodes.entries()) {
		// Ids are optional here because they're filled in on save. A supplied id must be
		// unique because it identifies the node on its own, wherever a name cannot.
		if (node.id !== undefined) {
			rejectDuplicate(nodeIds, node.id, {
				path: ['nodes', index, 'id'],
				message: `Duplicate node id "${node.id}"`,
				code: 'duplicate_node_id',
			});
		}

		rejectDuplicate(nodeNames, node.name, {
			path: ['nodes', index, 'name'],
			message: `Duplicate node name "${node.name}"`,
			code: 'duplicate_node_name',
		});
	}

	for (const sourceNodeName of Object.keys(connections)) {
		if (!nodeNames.has(sourceNodeName)) {
			issues.push({
				path: ['connections', sourceNodeName],
				message: `Connection source "${sourceNodeName}" does not reference an existing node`,
				code: 'unknown_connection_source',
			});
		}

		const connectionTypes = connections[sourceNodeName];
		for (const connectionType of Object.keys(connectionTypes)) {
			const buckets = connectionTypes[connectionType];

			for (const [sourceIndex, bucket] of buckets.entries()) {
				for (const [targetIndex, connection] of (bucket ?? []).entries()) {
					if (!nodeNames.has(connection.node)) {
						issues.push({
							path: [
								'connections',
								sourceNodeName,
								connectionType,
								sourceIndex,
								targetIndex,
								'node',
							],
							message: `Connection target "${connection.node}" does not reference an existing node`,
							code: 'unknown_connection_target',
						});
					}
				}
			}
		}
	}

	if (issues.length > 0) {
		return { success: false, issues };
	}

	return {
		success: true,
		data: parsed.data,
	};
}

export function parseWorkflowStructure(input: unknown): WorkflowStructureData {
	const result = safeParseWorkflowStructure(input);

	if (!result.success) {
		throw new WorkflowStructureValidationError(result.issues);
	}

	return result.data;
}
