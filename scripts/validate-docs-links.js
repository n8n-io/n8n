#!/usr/bin/env node

const path = require('path');
const https = require('https');
const glob = require('fast-glob');
const pLimit = require('p-limit');

const nodesBaseDir = path.resolve(__dirname, '../packages/nodes-base');

const validateUrl = async (kind, name, documentationUrl) =>
	new Promise((resolve, reject) => {
		if (!documentationUrl) resolve([name, null]);
		const url = new URL(
			/^https?:\/\//.test(documentationUrl)
				? documentationUrl
				: `https://docs.n8n.io/integrations/builtin/${kind}/${documentationUrl.toLowerCase()}/`,
		);
		https
			.request(
				{
					hostname: url.hostname,
					port: 443,
					path: url.pathname,
					method: 'HEAD',
				},
				(res) => resolve([name, res.statusCode]),
			)
			.on('error', (e) => reject(e))
			.end();
	});

const checkLinks = async (kind) => {
	let types = require(path.join(nodesBaseDir, `dist/types/${kind}.json`));
	if (kind === 'nodes')
		types = types.filter(({ codex }) => !!codex?.resources?.primaryDocumentation);
	const limit = pLimit(30);
	const statuses = await Promise.all(
		types.map((type) =>
			limit(() => {
				const documentationUrl =
					kind === 'credentials'
						? type.documentationUrl
						: type.codex?.resources?.primaryDocumentation?.[0]?.url;
				return validateUrl(kind, type.displayName, documentationUrl);
			}),
		),
	);

	const missingDocs = [];
	const invalidUrls = [];
	for (const [name, statusCode] of statuses) {
		if (statusCode === null) missingDocs.push(name);
		if (statusCode !== 200) invalidUrls.push(name);
	}

	if (missingDocs.length) console.log('Documentation URL missing for %s', kind, missingDocs);
	if (invalidUrls.length) console.log('Documentation URL invalid for %s', kind, invalidUrls);
	if (missingDocs.length || invalidUrls.length) process.exit(1);
};

(async () => {
	await checkLinks('credentials');
	await checkLinks('nodes');
})();
