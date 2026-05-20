import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ParsedOverride {
	rawKey: string;
	parent?: string;
	packageName: string;
	versionSelector?: string;
	targetVersion: string;
	line: number;
}

interface RootPackageJson {
	pnpm?: { overrides?: Record<string, string> };
}

export function parseOverrides(rootDir: string): ParsedOverride[] {
	const filePath = path.join(rootDir, 'package.json');
	if (!fs.existsSync(filePath)) return [];

	const content = fs.readFileSync(filePath, 'utf-8');
	let pkg: RootPackageJson;
	try {
		pkg = JSON.parse(content) as RootPackageJson;
	} catch {
		return [];
	}

	const overrides = pkg.pnpm?.overrides;
	if (!overrides || typeof overrides !== 'object') return [];

	const lines = content.split('\n');
	const overridesStart = findOverridesBlockStart(lines);

	const result: ParsedOverride[] = [];
	for (const [rawKey, targetVersion] of Object.entries(overrides)) {
		if (typeof targetVersion !== 'string') continue;
		result.push({
			rawKey,
			targetVersion,
			line: findKeyLine(lines, rawKey, overridesStart),
			...parseKey(rawKey),
		});
	}
	return result;
}

function findOverridesBlockStart(lines: string[]): number {
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes('"overrides"')) return i;
	}
	return 0;
}

function findKeyLine(lines: string[], key: string, startIdx: number): number {
	const needle = `"${key.replace(/"/g, '\\"')}"`;
	for (let i = startIdx; i < lines.length; i++) {
		if (lines[i].includes(needle)) return i + 1;
	}
	return startIdx + 1;
}

function parseKey(key: string): {
	parent?: string;
	packageName: string;
	versionSelector?: string;
} {
	const gtIdx = key.indexOf('>');
	if (gtIdx !== -1) {
		const parent = key.slice(0, gtIdx);
		const child = key.slice(gtIdx + 1);
		const { name, selector } = splitNameAndSelector(child);
		return { parent: stripSelector(parent), packageName: name, versionSelector: selector };
	}
	const { name, selector } = splitNameAndSelector(key);
	return { packageName: name, versionSelector: selector };
}

function splitNameAndSelector(token: string): { name: string; selector?: string } {
	if (token.startsWith('@')) {
		const slashIdx = token.indexOf('/');
		if (slashIdx === -1) return { name: token };
		const atIdx = token.indexOf('@', slashIdx);
		if (atIdx === -1) return { name: token };
		return { name: token.slice(0, atIdx), selector: token.slice(atIdx + 1) };
	}
	const atIdx = token.indexOf('@');
	if (atIdx === -1) return { name: token };
	return { name: token.slice(0, atIdx), selector: token.slice(atIdx + 1) };
}

function stripSelector(token: string): string {
	return splitNameAndSelector(token).name;
}

export function isEmptyPackageTarget(targetVersion: string): boolean {
	return targetVersion.startsWith('npm:empty-npm-package');
}

export function isCatalogTarget(targetVersion: string): boolean {
	return targetVersion.startsWith('catalog:');
}
