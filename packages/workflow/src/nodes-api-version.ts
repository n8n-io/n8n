import { N8N_NODES_API_VERSION } from '@n8n/constants';

export { N8N_NODES_API_VERSION };

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
