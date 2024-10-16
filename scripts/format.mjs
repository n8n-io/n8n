#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prettier = path.resolve('node_modules', '.bin', 'prettier');
const biome = path.resolve('node_modules', '.bin', 'biome');

[prettier, biome].forEach((bin) => {
	if (!fs.existsSync(bin)) {
		throw new Error(
			[`${path.basename(bin)} not found at path: ${bin}`, 'Please run `pnpm i` first'].join('\n'),
		);
	}
});

const prettierConfig = path.resolve('.prettierrc.js');
const biomeConfig = path.resolve('biome.jsonc');
const ignore = path.resolve('.prettierignore');

const ROOT_DIRS_TO_SKIP = ['.git', 'node_modules', 'packages', '.turbo', 'cypress'];
const EXTENSIONS_TO_FORMAT_WITH_PRETTIER = ['.yml'];
const EXTENSIONS_TO_FORMAT_WITH_BIOME = ['.js', '.json', '.ts'];

const isDir = (path) => fs.lstatSync(path).isDirectory();

const isPrettierTarget = (path) =>
	EXTENSIONS_TO_FORMAT_WITH_PRETTIER.some((ext) => path.endsWith(ext));
const isBiomeTarget = (path) => EXTENSIONS_TO_FORMAT_WITH_BIOME.some((ext) => path.endsWith(ext));

const biomeTargets = [];
const prettierTargets = [];

const walk = (dir) => {
	fs.readdirSync(dir).forEach((entry) => {
		const entryPath = path.resolve(dir, entry);
		if (isDir(entryPath)) walk(entryPath);
		if (isPrettierTarget(entryPath)) prettierTargets.push(entryPath);
		if (isBiomeTarget(entryPath)) biomeTargets.push(entryPath);
	});
};

fs.readdirSync('.').forEach((cur) => {
	if (ROOT_DIRS_TO_SKIP.includes(cur)) return;
	if (isDir(cur)) walk(cur);
	if (isPrettierTarget(cur)) prettierTargets.push(cur);
	if (isBiomeTarget(cur)) biomeTargets.push(cur);
});

execSync(
	[
		prettier,
		'--config',
		prettierConfig,
		'--ignore-path',
		ignore,
		'--write',
		prettierTargets.join(' '),
	].join(' '),
);

execSync(
	[biome, 'format', '--write', `--config-path=${biomeConfig}`, biomeTargets.join(' ')].join(' '),
);
