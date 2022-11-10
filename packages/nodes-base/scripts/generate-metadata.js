const path = require('path');
const glob = require('fast-glob');
const { createContext, Script } = require('vm');
const { mkdir, writeFile } = require('fs/promises');
const { LoggerProxy, NodeHelpers } = require('n8n-workflow');
const { PackageDirectoryLoader } = require('n8n-core');

LoggerProxy.init({
	log: console.log.bind(console),
	warn: console.warn.bind(console),
});

const packagePath = path.resolve(__dirname, '..');
const context = Object.freeze(createContext({ require }));
const loadClass = (filePath) => {
	try {
		const [className] = path.parse(filePath).name.split('.');
		const absolutePath = path.resolve(packagePath, filePath);
		const script = new Script(`new (require('${absolutePath}').${className})()`);
		const instance = script.runInContext(context);
		return { instance, filePath };
	} catch (e) {
		LoggerProxy.warn('Failed to load %s: %s', filePath, e.message);
	}
};

const writeJSON = async (file, data) => {
	const filePath = path.resolve(packagePath, 'dist', file);
	await mkdir(path.dirname(filePath), { recursive: true });
	const payload = Array.isArray(data)
		? `[\n${data.map((entry) => JSON.stringify(entry)).join(',\n')}\n]`
		: JSON.stringify(data, null, 2);
	await writeFile(filePath, payload, { encoding: 'utf-8' });
};

(async () => {
	const known = {};
	for (const kind of ['credentials', 'nodes']) {
		known[kind] = glob
			.sync(`dist/${kind}/**/*.${kind === 'nodes' ? 'node' : kind}.js`, {
				cwd: packagePath,
			})
			.filter((filePath) => !/[vV]\d.node.js$/.test(filePath))
			.map(loadClass)
			.reduce((obj, d) => {
				if (d) {
					const name = kind === 'nodes' ? d.instance.description.name : d.instance.name;
					if (name in obj) console.error('already loaded', kind, name, d.filePath);
					else obj[name] = d.filePath;
				}
				return obj;
			}, {});

		await writeJSON(`known/${kind}.json`, known[kind]);
	}

	const loader = new PackageDirectoryLoader(packagePath);
	await loader.loadAll(false);

	const credentialTypes = Object.values(loader.credentialTypes).map((data) => data.type);
	await writeJSON('types/credentials.json', credentialTypes);

	const nodeTypes = Object.values(loader.nodeTypes).map((data) => data.type);
	await writeJSON(
		'types/all-nodes.json',
		nodeTypes.flatMap((nodeData) => {
			const allNodeTypes = NodeHelpers.getVersionedNodeTypeAll(nodeData);
			return allNodeTypes.map((element) => ({ ...element.description }));
		}),
	);

	await writeJSON(
		'types/latest-nodes.json',
		nodeTypes.map((nodeData) => {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeData);
			return { ...nodeType.description };
		}),
	);

	const icons = { nodes: {}, credentials: {} };
	nodeTypes
		.filter((n) => !!n.description.icon)
		.forEach((n) => {
			const nodeName = n.description.name.split('.').slice(1).join('.');
			if (n.description.icon.startsWith('file:')) {
				icons.nodes[nodeName] = n.description.icon.substring(5);
			}
		});
	await writeJSON('icons/nodes.json', icons.nodes);
	credentialTypes
		.filter((c) => !!c.icon)
		.forEach((c) => {
			if (c.icon.startsWith('file:')) {
				icons.credentials[c.name] = c.icon.substring(5);
			}
		});
	await writeJSON('icons/credentials.json', icons.credentials);
})();
