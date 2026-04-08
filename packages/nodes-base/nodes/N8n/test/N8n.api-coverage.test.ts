/**
 * Contract test: n8n node vs n8n public API coverage.
 *
 * Reads the OpenAPI spec and compares it against the manifest in
 * n8n-api-coverage.json. Fails if any new endpoint is not registered
 * in the manifest, or if the manifest has stale entries.
 *
 * When this test fails because a new endpoint was added to the spec:
 * 1. Open packages/nodes-base/nodes/N8n/n8n-api-coverage.json
 * 2. Add an entry for each new endpoint with status "covered", "gap", or "excluded"
 *    - "covered" = implemented in the n8n node
 *    - "gap" = known gap, should eventually be implemented
 *    - "excluded" = intentionally not supported (requires a "reason" field)
 */

import fs from 'fs';
import path from 'path';

const OPENAPI_SPEC_PATH = path.resolve(
	__dirname,
	'../../../../../packages/cli/src/public-api/v1/openapi.yml',
);

const MANIFEST_PATH = path.resolve(__dirname, '../n8n-api-coverage.json');

const MANIFEST_RELATIVE = 'packages/nodes-base/nodes/N8n/n8n-api-coverage.json';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

// This test reads OpenAPI files from packages/cli. Keep Turbo inputs for
// n8n-nodes-base#test in sync (see turbo.json) so CLI spec changes invalidate cache.
// Matches path entries in openapi.yml: "  /some/path:\n    $ref: './relative/file.yml'"
const PATH_REF_PATTERN = /^ {2}(\/\S+):\s*\n\s+\$ref:\s*'([^']+)'/gm;

// Matches top-level HTTP method keys in path YAML files (no indentation)
const METHOD_PATTERN = /^(get|post|put|patch|delete|head|options):/gm;

interface ManifestEntry {
	status: 'covered' | 'gap' | 'excluded';
	nodeOperation?: string;
	reason?: string;
}

interface Manifest {
	endpoints: Record<string, ManifestEntry>;
}

function extractEndpointsFromSpec(): string[] {
	if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
		throw new Error(
			`OpenAPI spec not found at: ${OPENAPI_SPEC_PATH}\nCheck the path resolution in ${__filename}`,
		);
	}

	const specDir = path.dirname(OPENAPI_SPEC_PATH);
	const specContent = fs.readFileSync(OPENAPI_SPEC_PATH, 'utf-8');
	const endpoints: string[] = [];

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

function loadManifest(): Manifest {
	try {
		return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest;
	} catch (error) {
		throw new Error('Failed to parse ' + MANIFEST_RELATIVE + ': ' + String(error));
	}
}

describe('n8n node API coverage', () => {
	let specEndpoints: string[];
	let manifest: Manifest;

	beforeAll(() => {
		specEndpoints = extractEndpointsFromSpec();
		manifest = loadManifest();
	});

	it('every spec endpoint is tracked in the manifest', () => {
		const manifestKeys = new Set(Object.keys(manifest.endpoints));
		const unregistered = specEndpoints.filter((ep) => !manifestKeys.has(ep));

		const example = JSON.stringify({ status: 'gap' }, null, 2);

		expect(
			unregistered,
			[
				'API endpoint(s) in the spec are not in the manifest.',
				'Add each to: ' + MANIFEST_RELATIVE,
				'',
				'Missing:',
				...unregistered.map((ep) => '  - ' + ep),
				'',
				'Example entry:',
				`  "${unregistered[0] ?? 'METHOD /path'}": ${example}`,
			].join('\n'),
		).toEqual([]);
	});

	it('no stale manifest entries for removed endpoints', () => {
		const specSet = new Set(specEndpoints);
		const stale = Object.keys(manifest.endpoints).filter((key) => !specSet.has(key));

		expect(
			stale,
			[
				'Manifest entry(ies) reference endpoints no longer in the spec.',
				'Remove from: ' + MANIFEST_RELATIVE,
				'',
				'Stale:',
				...stale.map((ep) => '  - ' + ep),
			].join('\n'),
		).toEqual([]);
	});

	it('excluded entries have a reason', () => {
		const missing = Object.entries(manifest.endpoints)
			.filter(([, entry]) => entry.status === 'excluded' && !entry.reason)
			.map(([key]) => key);

		expect(
			missing,
			[
				'"excluded" entry(ies) missing required "reason" field.',
				'Fix in: ' + MANIFEST_RELATIVE,
				'',
				...missing.map((ep) => '  - ' + ep),
			].join('\n'),
		).toEqual([]);
	});
});
