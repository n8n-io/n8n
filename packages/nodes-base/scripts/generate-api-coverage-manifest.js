#!/usr/bin/env node
/**
 * Generate API coverage manifest from OpenAPI spec.
 * Ensures manifest stays in sync with actual API endpoints.
 * Preserves status/reason fields if they already exist.
 */

const fs = require('fs');
const path = require('path');

const SPEC_PATH = path.resolve(__dirname, '../../../packages/cli/src/public-api/v1/openapi.yml');
const MANIFEST_PATH = path.resolve(__dirname, '../nodes/N8n/n8n-api-coverage.json');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const PATH_REF_PATTERN = /^ {2}(\/\S+):\s*\n\s+\$ref:\s*'([^']+)'/gm;
const METHOD_PATTERN = /^(get|post|put|patch|delete|head|options):/gm;

function extractEndpoints() {
	if (!fs.existsSync(SPEC_PATH)) {
		console.error(`Error: OpenAPI spec not found at ${SPEC_PATH}`);
		process.exit(1);
	}

	const specDir = path.dirname(SPEC_PATH);
	const specContent = fs.readFileSync(SPEC_PATH, 'utf-8');
	const endpoints = [];

	let match;
	while ((match = PATH_REF_PATTERN.exec(specContent)) !== null) {
		const apiPath = match[1];
		const refFile = match[2];
		const refPath = path.resolve(specDir, refFile);
		const refContent = fs.readFileSync(refPath, 'utf-8');

		let methodMatch;
		while ((methodMatch = METHOD_PATTERN.exec(refContent)) !== null) {
			const method = methodMatch[1];
			if (HTTP_METHODS.has(method)) {
				endpoints.push(`${method.toUpperCase()} ${apiPath}`);
			}
		}
	}

	return endpoints.sort();
}

function loadExistingManifest() {
	if (fs.existsSync(MANIFEST_PATH)) {
		try {
			return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
		} catch {
			return null;
		}
	}
	return null;
}

function generate() {
	const endpoints = extractEndpoints();
	const existing = loadExistingManifest();

	const manifest = {
		$comment:
			'Coverage manifest: n8n node vs n8n public API. When a new endpoint is added to the OpenAPI spec, add it here with status covered/gap/excluded. See test/N8n.api-coverage.test.ts.',
		endpoints: {},
	};

	// Preserve existing entries, add new ones with "gap" status
	for (const endpoint of endpoints) {
		if (existing?.endpoints?.[endpoint]) {
			manifest.endpoints[endpoint] = existing.endpoints[endpoint];
		} else {
			manifest.endpoints[endpoint] = { status: 'gap' };
		}
	}

	// Write with consistent formatting
	fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, '\t') + '\n');

	const added =
		endpoints.length - (existing?.endpoints ? Object.keys(existing.endpoints).length : 0);
	if (added > 0) {
		console.log(`✅ Updated manifest: ${added} new endpoint(s) added with status "gap"`);
	} else {
		console.log('✅ Manifest is up to date');
	}
}

generate();
