
import TscWatchClient from 'tsc-watch/client.js';
import { LoadNodesAndCredentials } from '../../cli/dist/src/index.js'
import axios from 'axios';
import { Console } from 'console';

const watch = new TscWatchClient();

let afterFirstTranspilation = false;

const PACKAGE_NAME = 'n8n-nodes-base';

watch.on('first_success', () => {
	// on first transpilation all nodes are transpiled
	// make sure to do nothing until is done
	afterFirstTranspilation = true;
});

watch.on('file_emitted', async (filePath) => {
	// Once a file is transpiled this event is emited 3 times
	// with the fllowing extensions .js .js.map and d.ts
	// so only act when we get the .js file

	console.log(filePath);

	if (afterFirstTranspilation && filePath.includes('.js') && !filePath.includes('.map')) {


		///Users/ricardoe105/Desktop/n8n/packages/nodes-base/dist/nodes/Mattermost/v1/MattermostV1.node.js
		///Users/ricardoe105/Desktop/n8n/packages/nodes-base/dist/nodes/Mattermost/v1/actions/channel/index.js
		///Users/ricardoe105/Desktop/n8n/packages/nodes-base/dist/nodes/HttpRequest/HttpRequest.node.js

		console.log('este es el file path');
		console.log(filePath);

		let version = 1;

		let nodeDescription = '';

		const [path, nodeNamePart] = filePath.split('/nodes/')

		const nodeName = nodeNamePart.split('/')[0];

		const isVersionedFile = nodeNamePart.includes(`${nodeName}/v`);

		if (isVersionedFile) {
			// /n8n/packages/nodes-base/dist/nodes/Mattermost/v1/*
			filePath = `${path}/nodes/${nodeName}/${nodeName}.node.js`;
			version = parseInt(nodeNamePart.split(`${nodeName}/v`)[1].split('/')[0]);
		}

		const loadNodesAndCredentials = LoadNodesAndCredentials();
		await loadNodesAndCredentials.loadNodeFromFile(PACKAGE_NAME, nodeName, filePath, true);

		const name = Object.keys(loadNodesAndCredentials.nodeTypes)[0];
		const nodeData = loadNodesAndCredentials.nodeTypes[name];

		// @ts-ignore
		nodeDescription = nodeData.type.description;

		if (isVersionedFile) {
			console.log('IMPRIMIENTO AQUIIII');
			// @ts-ignore
			console.log(nodeData.type.nodeVersions);

			// @ts-ignore
			nodeDescription = nodeData.type.nodeVersions[version].description;
			console.log('ahora si papa');
			//@ts-ignore
			console.log(JSON.stringify(nodeDescription.properties, undefined, 2));
		}

		//@ts-ignore
		// const version = Math.max(...nodeData.type.description.version);

		try {
			await axios.post('http://localhost:5678/dev-node-description-updated', {
				name: nodeData.type.description.name,
				description: nodeDescription,
				version,
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
