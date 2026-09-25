/**
 * A test spec discovered by a runner adapter, with the worker configuration
 * it needs. Owned here — not by any runner-specific discovery — so the
 * framework-free orchestrator can bin-pack without depending on the ts-morph
 * discovery that produces these. Janitor's `test-discovery-analyzer` re-exports
 * this type for its own `DiscoveryReport`.
 */
export interface DiscoveredSpec {
	/** Spec file path relative to rootDir. */
	path: string;
	/** Named capability options from test.use(). */
	capabilities: string[];
	/** Container services from inline test.use() capability configurations. */
	services: string[];
	/** The fixture pools that this spec starts. */
	fixturePools?: string[];
}
