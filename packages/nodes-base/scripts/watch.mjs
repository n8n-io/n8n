
import TscWatchClient from 'tsc-watch/client.js';
import { LoadNodesAndCredentials, NodeTypes } from '../../cli/dist/src/index.js'
import axios from 'axios';

const watch = new TscWatchClient();

let afterFistTranspilation = false;

const PACKAGE_NAME = 'n8n-nodes-base';

watch.on('started', () => { });

watch.on('first_success', () => {
	// on first transpilation all nodes are transpiled
	// make sure to do nothing until is done
	afterFistTranspilation = true;
});

watch.on('success', () => { })

watch.on('compile_errors', () => { });

watch.on('file_emitted', async (filePath) => {
	// Once a file is transpiled this event is emited 3 times
	// with the fllowing extensions .js .js.map and d.ts
	// so only act when we get the .js file
	if (filePath.includes('.js') && !filePath.includes('.map') && afterFistTranspilation) {

		const [_, nodeName] = filePath.match(/.*\/(.*).node.js/);

		const loadNodesAndCredentials = LoadNodesAndCredentials();
		await loadNodesAndCredentials.loadNodeFromFile(PACKAGE_NAME, nodeName, filePath, true);
		const name = Object.keys(loadNodesAndCredentials.nodeTypes)[0];
		const nodeData = loadNodesAndCredentials.nodeTypes[name];

		try {
			await axios.post('http://localhost:5678/dev-node-description-updated', {
				type: name,
				description: nodeData.type.description,
			});
		} catch (error) {
		}
	}
});

watch.start('--project', '.', '--listEmittedFiles');

try {
} catch (e) {
	watch.kill();
}
