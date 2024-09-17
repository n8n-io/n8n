#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';

function isDockerContainer() {
	try {
		return fs.existsSync('/.dockerenv');
	} catch {
		return false;
	}
}

function isDockerBuildkit() {
	try {
		const cgroupPath = '/proc/1/cgroup';

		if (!fs.existsSync(cgroupPath)) return false;

		const cgroupContent = fs.readFileSync(cgroupPath, 'utf8');
		return cgroupContent.includes('docker') || cgroupContent.includes('0::/');
	} catch {
		return false;
	}
}

function isDocker() {
	return isDockerContainer() || isDockerBuildkit();
}

if (process.env.CI || isDocker()) {
	process.exit(0);
}

execSync('./node_modules/.bin/lefthook install', { stdio: 'inherit' });
