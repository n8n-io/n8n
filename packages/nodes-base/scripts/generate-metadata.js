const path = require('path');
const glob = require('fast-glob');
const { createContext, Script } = require('vm');
const { mkdir, writeFile } = require('fs/promises');
const { LoggerProxy, NodeHelpers } = require('n8n-workflow');
const { PackageDirectoryLoader } = require('n8n-core');
const { copyFileSync } = require('fs');

LoggerProxy.init({
	log: console.log.bind(console),
	warn: console.warn.bind(console),
});

const packageDir = path.resolve(__dirname, '..');
const { name: packageName } = require(path.join(packageDir, 'package.json'));
const distDir = path.join(packageDir, 'dist');

const context = Object.freeze(createContext({ require }));
const loadClass = (filePath) => {
	try {
		const [className] = path.parse(filePath).name.split('.');
		const absolutePath = path.resolve(packageDir, filePath);
		const script = new Script(`new (require('${absolutePath}').${className})()`);
		const instance = script.runInContext(context);
		return { instance, filePath };
	} catch (e) {
		LoggerProxy.warn('Failed to load %s: %s', filePath, e.message);
	}
};

const writeJSON = async (file, data) => {
	const filePath = path.resolve(distDir, file);
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
				cwd: packageDir,
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

	await mkdir(path.resolve(distDir, 'icons/nodes'), { recursive: true });
	await mkdir(path.resolve(distDir, 'icons/credentials'), { recursive: true });

	const loader = new PackageDirectoryLoader(packageDir);
	await loader.loadAll(false);

	const credentialTypes = Object.values(loader.credentialTypes).map((data) => data.type);
	credentialTypes
		.filter(({ icon }) => icon?.startsWith('file:'))
		.forEach((credential) => {
			const iconFilePath = path.resolve(packageDir, credential.icon.substring(5));
			const iconUrl = `icons/credentials/${credential.name}${path.extname(iconFilePath)}`;
			copyFileSync(iconFilePath, path.resolve(distDir, iconUrl));
			delete credential.icon;
			credential.iconUrl = iconUrl;
		});
	await writeJSON('types/credentials.json', credentialTypes);

	const nodeTypes = Object.values(loader.nodeTypes).map((data) => data.type);
	nodeTypes
		.filter(({ description: { icon } }) => icon?.startsWith('file:'))
		.forEach(({ description }) => {
			const nodeName = description.name.split('.').slice(1).join('.');
			const iconFilePath = path.resolve(packageDir, description.icon.substring(5));
			const iconUrl = `icons/nodes/${packageName}.${nodeName}${path.extname(iconFilePath)}`;
			copyFileSync(iconFilePath, path.resolve(distDir, iconUrl));
			delete description.icon;
			description.iconUrl = iconUrl;
		});

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
})();
