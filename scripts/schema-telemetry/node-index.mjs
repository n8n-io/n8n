/**
 * Maps node types to their source folders. The built `dist/known/nodes.json`
 * of a package names each node's file, even when the file name differs from
 * the type name (`sendInBlue` lives in `Brevo.node.ts`). Without a build, a
 * node type matches the file in the package's `n8n.nodes` list whose name
 * (without `.node.js`) equals the type name, ignoring case.
 */

function sourceLocation(pkg, nodePath) {
	const source = nodePath.replace(/^dist\//, '').replace(/\.js$/, '.ts');
	const folder = source.split('/').slice(0, -1).join('/');
	return { dir: `${pkg.dir}/${folder}`, sourceFile: `${pkg.dir}/${source}`, pkgDir: pkg.dir };
}

function sourceDirsByName(pkg) {
	const byName = new Map();
	for (const nodePath of pkg.nodes) {
		const name = nodePath
			.split('/')
			.pop()
			?.replace(/\.node\.js$/, '')
			.toLowerCase();
		if (name) byName.set(name, sourceLocation(pkg, nodePath));
	}
	for (const [name, { sourcePath }] of Object.entries(pkg.known ?? {})) {
		byName.set(name.toLowerCase(), sourceLocation(pkg, sourcePath));
	}
	return byName;
}

function resolveNode(type, packages, lookups) {
	const separator = type.lastIndexOf('.');
	const pkgName = type.slice(0, separator);
	const shortName = type.slice(separator + 1).toLowerCase();
	const pkgIndex = packages.findIndex((p) => p.name === pkgName);
	return pkgIndex === -1 ? undefined : lookups[pkgIndex].get(shortName);
}

/**
 * @param {{ name: string, dir: string, nodes: string[], known?: Record<string, { sourcePath: string }> }[]} packages
 *   `known` is the package's built `dist/known/nodes.json`, if any
 * @param {{ types: string[], noOperationTypes: string[], schemaPaths?: Map<string, string> }} telemetry
 *   node types seen, those seen without an operation, and the `schemaPath` each node declares
 * @returns {Map<string, { dir: string, sourceFile: string, noOperationSiblings: string[] }>}
 */
export function buildNodeIndex(packages, { types, noOperationTypes, schemaPaths = new Map() }) {
	const lookups = packages.map(sourceDirsByName);
	const nodes = new Map();
	for (const type of new Set([...types, ...noOperationTypes])) {
		const node = resolveNode(type, packages, lookups);
		if (!node) continue;
		// A declared schemaPath moves the node's schemas out of a shared folder.
		const schemaPath = schemaPaths.get(type);
		const { pkgDir, ...rest } = node;
		nodes.set(type, schemaPath ? { ...rest, dir: `${pkgDir}/nodes/${schemaPath}` } : rest);
	}

	const index = new Map();
	for (const type of types) {
		const node = nodes.get(type);
		if (!node) continue;
		const noOperationSiblings = noOperationTypes.filter(
			(t) => t !== type && nodes.get(t)?.dir === node.dir,
		);
		index.set(type, { ...node, noOperationSiblings });
	}
	return index;
}

/**
 * Node types that telemetry never shows with an operation. An action node on
 * its default operation often omits the parameter, but the schema lookup fills
 * in that default, so such a node does not read a trigger's `output.json`.
 *
 * @param {{ node_type: string, operation?: string | null }[]} rows
 */
export function noOperationTypesOf(rows) {
	const withOperation = new Set(rows.filter((r) => r.operation).map((r) => r.node_type));
	return [...new Set(rows.filter((r) => !r.operation).map((r) => r.node_type))].filter(
		(type) => !withOperation.has(type),
	);
}
