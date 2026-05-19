import { z } from 'zod';

import type { INode } from '../interfaces';
import { INodeSchema } from '../schemas';

/**
 * Fields that should be excluded when serialising a node.
 * */
export const RUNTIME_ONLY_NODE_FIELDS = [
	'extendsCredential',
	'rewireOutputLogTo',
	'forceCustomOperation',
] as const satisfies ReadonlyArray<keyof INode>;

export const SerializableNodeSchema = INodeSchema.omit({
	extendsCredential: true,
	rewireOutputLogTo: true,
	forceCustomOperation: true,
}).extend({
	parameters: z.record(z.string(), z.unknown()),
});

export type SerializableNode = z.infer<typeof SerializableNodeSchema>;

/**
 * This is a safety check to ensure "serialized" types stay in sync with types in the system.
 *
 * If INode changes you will need to decide if the field should be "included" when serialised or "excluded"
 *
 * This looks quite scary but you can leave this type as is and update `SerializableNodeSchema` and `RUNTIME_ONLY_NODE_FIELDS`
 * above to fix the typecheck error.
 **/
type _MissingFromSerializableNode = Exclude<
	keyof INode,
	keyof SerializableNode | (typeof RUNTIME_ONLY_NODE_FIELDS)[number]
>;
type _AllINodeFieldsAccountedFor = [_MissingFromSerializableNode] extends [never]
	? true
	: {
			__error: 'INode field(s) missing from SerializableNode and RUNTIME_ONLY_NODE_FIELDS — classify the new field as wire-format (add to INodeSchema) or runtime-only (add to RUNTIME_ONLY_NODE_FIELDS)';
			__missing: _MissingFromSerializableNode;
		};
const _allINodeFieldsAccountedFor = true as const satisfies _AllINodeFieldsAccountedFor;
void _allINodeFieldsAccountedFor;

const serializableConnectionLeafSchema = z.object({
	node: z.string(),
	type: z.string(),
	index: z.number(),
});

export const SerializableConnectionsSchema = z.record(
	z.string(),
	z.record(z.string(), z.array(z.array(serializableConnectionLeafSchema).nullable())),
);

export type SerializableConnections = z.infer<typeof SerializableConnectionsSchema>;

export interface SerializableWorkflow {
	id: string;
	name: string;
	nodes: SerializableNode[];
	connections: SerializableConnections;
	settings?: Record<string, unknown>;
	versionId: string;
	parentFolderId: string | null;
	active: boolean;
	isArchived: boolean;
}

export const SerializableWorkflowSchema: z.ZodType<SerializableWorkflow> = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	nodes: z.array(SerializableNodeSchema),
	connections: SerializableConnectionsSchema,
	settings: z.record(z.string(), z.unknown()).optional(),
	versionId: z.string(),
	parentFolderId: z.string().nullable(),
	active: z.boolean(),
	isArchived: z.boolean(),
});
