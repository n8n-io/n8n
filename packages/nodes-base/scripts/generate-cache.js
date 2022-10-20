const path = require('path');
const { fileURLToPath } = require('url');
const { PackageDirectoryLoader } = require('n8n-core');
const { LoggerProxy } = require('n8n-workflow');

LoggerProxy.init({
	log: console.log.bind(console, '->'),
});

const packagePath = path.resolve(__dirname, '..');
const loader = new PackageDirectoryLoader(packagePath);
loader.init({ cachingEnabled: true });
