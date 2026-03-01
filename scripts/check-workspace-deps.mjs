#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

const isPackageJson = (file) => file.endsWith('package.json');
const files = process.argv.slice(2).filter((file) => file && isPackageJson(file) && existsSync(file));
let foundError = false;

for (const file of files) {
	try {
		const content = readFileSync(file, 'utf8');
		if (content.includes('"workspace:^"')) {
			if (!foundError) {
				console.log('');
				console.log("ERROR: Found 'workspace:^' in package.json files.");
				console.log('');
				console.log("Use 'workspace:*' instead to pin exact versions.");
				console.log("Using 'workspace:^' causes npm to resolve semver ranges when users");
				console.log("install from npm, which can lead to version mismatches between");
				console.log("@n8n/* packages and break n8n startup.");
				console.log('');
			}
			foundError = true;
		}
	} catch (error) {
		// Ignore read errors for individual files
	}
}

if (foundError) {
	process.exit(1);
}
