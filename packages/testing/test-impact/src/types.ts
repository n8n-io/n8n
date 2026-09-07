/**
 * A test spec discovered by a runner adapter, with the capabilities (container
 * tags) it needs. Owned here — not by any runner-specific discovery — so the
 * framework-free orchestrator can bin-pack without depending on the ts-morph
 * discovery that produces these. Janitor's `test-discovery-analyzer` re-exports
 * this type for its own `DiscoveryReport`.
 */
export interface DiscoveredSpec {
	/** Spec file path relative to rootDir. */
	path: string;
	/** Capabilities extracted from tags matching the capability prefix. */
	capabilities: string[];
}
