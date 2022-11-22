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

const packageDir = path.resolve(__dirname, '..');
const distDir = path.join(packageDir, 'dist');

const context = Object.freeze(createContext({ require }));
const loadClass = (sourcePath) => {
	try {
		const [className] = path.parse(sourcePath).name.split('.');
		const absolutePath = path.resolve(packageDir, sourcePath);
		const script = new Script(`new (require('${absolutePath}').${className})()`);
		const instance = script.runInContext(context);
		return { instance, sourcePath, className };
	} catch (e) {
		LoggerProxy.warn('Failed to load %s: %s', sourcePath, e.message);
	}
};

const writePromises = [];
const writeJSON = (file, data) => {
	const filePath = path.resolve(distDir, file);
	mkdir(path.dirname(filePath), { recursive: true }).then(() => {
		const payload = Array.isArray(data)
			? `[\n${data.map((entry) => JSON.stringify(entry)).join(',\n')}\n]`
			: JSON.stringify(data, null, 2);
		writePromises.push(writeFile(filePath, payload, { encoding: 'utf-8' }));
	});
};

(async () => {
	const known = {};
	for (const kind of ['credentials', 'nodes']) {
		known[kind] = glob
			.sync(`dist/${kind}/**/*.${kind === 'nodes' ? 'node' : kind}.js`, {
				cwd: packageDir,
			})
			.filter((filePath) => !/[vV]\d.node\.js$/.test(filePath))
			.map(loadClass)
			.filter((data) => !!data)
			.reduce((obj, { className, sourcePath, instance }) => {
				const name = kind === 'nodes' ? instance.description.name : instance.name;
				if (name in obj) console.error('already loaded', kind, name, sourcePath);
				else obj[name] = { className, sourcePath };
				return obj;
			}, {});

		writeJSON(`known/${kind}.json`, known[kind]);
	}

	const loader = new PackageDirectoryLoader(packageDir);
	await loader.loadAll();

	const credentialTypes = Object.values(loader.credentialTypes).map((data) => data.type);
	writeJSON('types/credentials.json', credentialTypes);

	const nodeTypes = Object.values(loader.nodeTypes)
		.map((data) => data.type)
		.flatMap((nodeData) => {
			const allNodeTypes = NodeHelpers.getVersionedNodeTypeAll(nodeData);
			return allNodeTypes.map((element) => element.description);
		});

	writeJSON('types/nodes.json', nodeTypes);

	await Promise.all(writePromises);
})();
