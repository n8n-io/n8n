/**
 * Snapshot of packages that declare a curated single-instance lib as a `peerDependency`.
 *
 * The `single-instance-libs` rule is otherwise presence-based (it flags a curated lib that appears
 * in the wrong section) and so cannot see a curated peer that is *removed* from every section — yet
 * a package that still imports the lib at runtime but no longer declares the peer lets consumers
 * resolve a second physical copy, the exact single-instance regression the peer model prevents.
 * This snapshot lets the rule fail when a listed package drops a required curated peer.
 *
 * Keyed by curated lib -> package names that must keep declaring it as a peerDependency. Update an
 * entry only when a package intentionally adds or removes a curated peer (the rule's error names the
 * file to edit).
 */
export const REQUIRED_CURATED_PEERS: Record<string, string[]> = {
	zod: ['@n8n/agents', '@n8n/api-types', '@n8n/json-schema-to-zod', 'n8n-core', 'n8n-workflow'],
};
