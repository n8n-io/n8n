/**
 * Node-authoring API level supported by this runtime.
 *
 * Compatibility rule for community packages:
 * `package.n8n.n8nNodesApiVersion <= N8N_NODES_API_VERSION`.
 *
 * The level mirrors the n8n major for the v3 transition: `1` on master
 * (which ships as 2.x during the v3 window) and `3` on the `3.x` branch,
 * where it also serves as the v3 feature flag for node-authoring APIs.
 */
export const N8N_NODES_API_VERSION = 1;

/** Minimal package.json shape needed to check node API compatibility. */
export interface NodesApiVersionPackageJson {
	n8n?: {
		/**
		 * Node-authoring API level the package requires. Absent in legacy
		 * packages, which are treated as requiring level 1.
		 */
		n8nNodesApiVersion?: unknown;
	};
}

export type NodesApiVersionCheck =
	| {
			compatible: true;
			/** Effective required API level; 1 for packages without metadata. */
			version: number;
	  }
	| {
			compatible: false;
			reason: 'malformed' | 'unsupported';
			/** The declared value, as read from package.json. */
			declared: unknown;
	  };

/**
 * Read a community package's declared node-authoring API level and check it
 * against the level this runtime supports (`required <= N8N_NODES_API_VERSION`).
 *
 * Missing `n8n.n8nNodesApiVersion` means a legacy package and resolves to
 * level 1. Malformed values (non-integer, non-positive, non-number) are
 * reported as incompatible — the runtime cannot distinguish an old package
 * from a corrupt or hostile one if both fall back to legacy.
 */
export function getNodesApiVersion(pkgJson: NodesApiVersionPackageJson): NodesApiVersionCheck {
	const declared = pkgJson?.n8n?.n8nNodesApiVersion;

	if (declared === undefined) {
		return { compatible: true, version: 1 };
	}

	if (typeof declared !== 'number' || !Number.isInteger(declared) || declared < 1) {
		return { compatible: false, reason: 'malformed', declared };
	}

	if (declared <= N8N_NODES_API_VERSION) {
		return { compatible: true, version: declared };
	}

	return { compatible: false, reason: 'unsupported', declared };
}
