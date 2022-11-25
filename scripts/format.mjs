#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prettier = path.resolve('node_modules', 'prettier', 'bin-prettier.js');

if (!fs.existsSync(prettier)) {
	throw new Error(
		[`Prettier not found at path: ${prettier}`, 'Please run `pnpm i` first'].join('\n'),
	);
}

const config = path.resolve('.prettierrc.js');
const ignore = path.resolve('.prettierignore');

const ROOT_DIRS_TO_SKIP = ['.git', 'node_modules', 'packages'];
const EXTENSIONS_TO_FORMAT = ['.md', '.yml', '.js', '.json'];

const isDir = (path) => fs.lstatSync(path).isDirectory();

const isTarget = (path) => EXTENSIONS_TO_FORMAT.some((ext) => path.endsWith(ext));

const walk = (dir, test, found = []) => {
	fs.readdirSync(dir).forEach((entry) => {
		const entryPath = path.resolve(dir, entry);
		if (isDir(entryPath)) walk(entryPath, test, found);
		if (test(entryPath)) found.push(entryPath);
	});

	return found;
};

const targets = fs
	.readdirSync('.')
	.reduce((acc, cur) => {
		if (ROOT_DIRS_TO_SKIP.includes(cur)) return acc;
		if (isDir(cur)) return [...acc, ...walk(cur, isTarget)];
		if (isTarget(cur)) return [...acc, cur];

		return acc;
	}, [])
	.join(' ');

execSync([prettier, '--config', config, '--ignore-path', ignore, '--write', targets].join(' '));
