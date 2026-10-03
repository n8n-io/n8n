/**
 * Validates that no node version shows two same-named parameters whose values
 * have different shapes, such as a resource locator next to a string.
 *
 * The editor keeps parameter values by name when the user switches resource or
 * operation. An object value then lands in the plain field and renders as
 * "[object Object]". Give each such parameter a name of its own.
 *
 * Run as part of: pnpm lint
 */

const path = require('path');
const { NodeHelpers } = require('n8n-workflow');

let knownNodes;
try {
	knownNodes = require('../dist/known/nodes.json');
} catch {
	console.error('Failed to find dist/known/nodes.json. Please run `pnpm build` first.');
	process.exit(1);
}

const conflicts = new Set();

for (const [nodeName, { className, sourcePath }] of Object.entries(knownNodes)) {
	const nodeType = new (require(path.join(__dirname, '..', sourcePath))[className])();
	const versions =
		'nodeVersions' in nodeType
			? Object.keys(nodeType.nodeVersions).map(Number)
			: [nodeType.description.version].flat();

	for (const version of versions) {
		const { properties } = NodeHelpers.getVersionedNodeType(nodeType, version).description;
		for (const { name } of NodeHelpers.findParameterShapeConflicts(properties, version)) {
			conflicts.add(`${nodeName}.${name}`);
		}
	}
}

if (conflicts.size > 0) {
	console.error('ERROR: These parameters share a name with a parameter of another value shape:');
	console.error([...conflicts].sort());
	console.error('Rename one of them, so a resource locator object cannot land in a plain field.');
	process.exit(1);
}
