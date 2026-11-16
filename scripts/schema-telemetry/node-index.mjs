/**
 * Maps node types to their source folders from each package's `n8n.nodes`
 * list, so the script needs no build. A node type matches the file whose name
 * (without `.node.js`) equals the type name, ignoring case — the convention
 * every built-in node follows.
 */

function sourceDirsByName(pkg) {
	const byName = new Map();
	for (const nodePath of pkg.nodes) {
		const name = nodePath
			.split('/')
			.pop()
			?.replace(/\.node\.js$/, '')
			.toLowerCase();
		const source = nodePath.replace(/^dist\//, '').replace(/\.js$/, '.ts');
		const folder = source.split('/').slice(0, -1).join('/');
		if (name) byName.set(name, { dir: `${pkg.dir}/${folder}`, sourceFile: `${pkg.dir}/${source}` });
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
 * @param {{ name: string, dir: string, nodes: string[] }[]} packages
 * @param {{ types: string[], noOperationTypes: string[] }} telemetry node types seen,
 *   and those seen without an operation
 * @returns {Map<string, { dir: string, sourceFile: string, noOperationSiblings: string[] }>}
 */
export function buildNodeIndex(packages, { types, noOperationTypes }) {
	const lookups = packages.map(sourceDirsByName);
	const nodes = new Map();
	for (const type of new Set([...types, ...noOperationTypes])) {
		const node = resolveNode(type, packages, lookups);
		if (node) nodes.set(type, node);
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
