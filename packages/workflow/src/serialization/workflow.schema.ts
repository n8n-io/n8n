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

const RUNTIME_ONLY_OMIT_MASK = Object.fromEntries(
	RUNTIME_ONLY_NODE_FIELDS.map((field) => [field, true as const]),
) as { [K in (typeof RUNTIME_ONLY_NODE_FIELDS)[number]]: true };

// `parameters` is overridden as an opaque record: INodeParametersSchema is too
// strict for arbitrary user-defined node parameters on the wire.
export const SerializableNodeSchema = INodeSchema.omit(RUNTIME_ONLY_OMIT_MASK).extend({
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

export const SerializableConnectionLeafSchema = z.object({
	node: z.string(),
	type: z.string(),
	index: z.number(),
});

export const SerializableConnectionsSchema = z.record(
	z.string(),
	z.record(z.string(), z.array(z.array(SerializableConnectionLeafSchema).nullable())),
);

export type SerializableConnections = z.infer<typeof SerializableConnectionsSchema>;

export const SerializableWorkflowSchema = z.object({
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

export type SerializableWorkflow = z.infer<typeof SerializableWorkflowSchema>;
