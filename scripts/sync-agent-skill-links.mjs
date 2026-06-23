#!/usr/bin/env node

import { lstat, mkdir, readdir, readlink, stat, symlink, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sharedSkillsDir = path.join(repoRoot, '.agents', 'skills');
const harnessSkillDirs = [
	{
		name: 'Claude plugin',
		dir: path.join(repoRoot, '.claude', 'plugins', 'n8n', 'skills'),
	},
];

const usage = `Usage:
  node scripts/sync-agent-skill-links.mjs [--check]`;

const formatPath = (filePath) => path.relative(repoRoot, filePath) || '.';

const relativeLinkTarget = (fromDir, toPath) =>
	path.relative(fromDir, toPath).split(path.sep).join(path.posix.sep);

const safeLstat = async (filePath) => {
	try {
		return await lstat(filePath);
	} catch (error) {
		if (error.code === 'ENOENT') return undefined;
		throw error;
	}
};

const pathExists = async (filePath) => (await safeLstat(filePath)) !== undefined;

const hasSkillFile = async (skillDir) => pathExists(path.join(skillDir, 'SKILL.md'));

const isDirectory = async (filePath) => {
	try {
		return (await stat(filePath)).isDirectory();
	} catch (error) {
		if (error.code === 'ENOENT') return false;
		throw error;
	}
};

const listSharedSkillNames = async () => {
	const entries = await readdir(sharedSkillsDir, { withFileTypes: true });
	const skills = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;

		const skillDir = path.join(sharedSkillsDir, entry.name);
		const isSkillDir = entry.isDirectory() || (entry.isSymbolicLink() && (await isDirectory(skillDir)));

		if (isSkillDir && (await hasSkillFile(skillDir))) {
			skills.push(entry.name);
		}
	}

	return skills.sort();
};

const isBrokenSymlink = async (filePath) => {
	try {
		await stat(filePath);
		return false;
	} catch (error) {
		if (error.code === 'ENOENT') return true;
		throw error;
	}
};

// True only for symlinks that point back into .agents/skills, i.e. links this
// script owns. Personal/harness-only symlinks pointing elsewhere are left alone.
const pointsIntoSharedSkills = async (linkPath) => {
	const target = path.resolve(path.dirname(linkPath), await readlink(linkPath));
	return target === sharedSkillsDir || target.startsWith(sharedSkillsDir + path.sep);
};

const ensureSkillLink = async ({ harness, skillName, check, errors, actions }) => {
	const sharedSkillDir = path.join(sharedSkillsDir, skillName);
	const linkPath = path.join(harness.dir, skillName);
	const expectedTarget = relativeLinkTarget(harness.dir, sharedSkillDir);
	const existing = await safeLstat(linkPath);

	if (!existing) {
		if (check) {
			errors.push(
				`${harness.name}: missing skill link for ${skillName} at ${formatPath(linkPath)}`,
			);
			return;
		}

		await symlink(expectedTarget, linkPath, 'dir');
		actions.push(`created ${formatPath(linkPath)} -> ${expectedTarget}`);
		return;
	}

	if (existing.isSymbolicLink()) {
		const actualTarget = await readlink(linkPath);
		const broken = await isBrokenSymlink(linkPath);

		if (actualTarget !== expectedTarget || broken) {
			if (check) {
				const reason = broken ? 'broken' : `points to ${actualTarget}`;
				errors.push(
					`${harness.name}: ${formatPath(linkPath)} ${reason}; expected ${expectedTarget}`,
				);
				return;
			}

			await unlink(linkPath);
			await symlink(expectedTarget, linkPath, 'dir');
			actions.push(`fixed ${formatPath(linkPath)} -> ${expectedTarget}`);
		}

		return;
	}

	if (existing.isDirectory()) {
		return;
	}

	// Accumulate into errors and let syncLinks throw the aggregate after the loop,
	// so `sync` doesn't abort mid-loop with partial on-disk state and stays
	// consistent with `--check`.
	if (existing.isFile()) {
		// A regular file where a symlink is expected is almost always a checkout
		// with symlink support disabled (git materializes mode-120000 links as
		// plain text stubs), most commonly on Windows.
		errors.push(
			`${harness.name}: ${formatPath(linkPath)} is a regular file, not a symlink. ` +
				`This usually means git symlinks are disabled (common on Windows). ` +
				`Enable them (git config core.symlinks true, plus Developer Mode or WSL) and re-checkout.`,
		);
		return;
	}

	errors.push(`${harness.name}: ${formatPath(linkPath)} exists but is not a symlink or directory`);
};

const checkUnexpectedSymlinks = async ({ harness, sharedSkillNames, errors }) => {
	const entries = await readdir(harness.dir, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isSymbolicLink() || sharedSkillNames.has(entry.name)) continue;

		const linkPath = path.join(harness.dir, entry.name);

		// Only flag links we own (pointing into .agents/skills). A link pointing
		// there but whose name is no longer a shared skill is stale.
		if (!(await pointsIntoSharedSkills(linkPath))) continue;

		if (await isBrokenSymlink(linkPath)) {
			errors.push(`${harness.name}: ${formatPath(linkPath)} is a broken symlink`);
			continue;
		}

		errors.push(
			`${harness.name}: ${formatPath(linkPath)} is a stale link to a removed shared skill`,
		);
	}
};

const ensureHarnessSkillDir = async ({ harness, check, errors, actions }) => {
	const existing = await safeLstat(harness.dir);

	if (!existing) {
		if (check) {
			errors.push(`${harness.name}: missing skill directory at ${formatPath(harness.dir)}`);
			return false;
		}

		await mkdir(harness.dir, { recursive: true });
		actions.push(`created ${formatPath(harness.dir)}`);
		return true;
	}

	if (await isDirectory(harness.dir)) return true;

	const message = `${harness.name}: ${formatPath(harness.dir)} exists but is not a directory`;
	if (check) {
		errors.push(message);
		return false;
	}

	throw new Error(message);
};

const removeUnexpectedSymlinks = async ({ harness, sharedSkillNames, actions }) => {
	const entries = await readdir(harness.dir, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isSymbolicLink() || sharedSkillNames.has(entry.name)) continue;

		const linkPath = path.join(harness.dir, entry.name);

		// Only prune links we own (pointing into .agents/skills). Never delete a
		// hand-placed personal/harness-only symlink that points elsewhere.
		if (!(await pointsIntoSharedSkills(linkPath))) continue;

		const actualTarget = await readlink(linkPath);
		await unlink(linkPath);
		actions.push(`removed stale ${formatPath(linkPath)} -> ${actualTarget}`);
	}
};

const syncLinks = async ({ check }) => {
	const skillNames = await listSharedSkillNames();
	const sharedSkillNames = new Set(skillNames);
	const errors = [];
	const actions = [];

	for (const harness of harnessSkillDirs) {
		const harnessDirReady = await ensureHarnessSkillDir({ harness, check, errors, actions });
		if (!harnessDirReady) continue;

		for (const skillName of skillNames) {
			await ensureSkillLink({ harness, skillName, check, errors, actions });
		}

		if (check) {
			await checkUnexpectedSymlinks({ harness, sharedSkillNames, errors });
		} else {
			await removeUnexpectedSymlinks({ harness, sharedSkillNames, actions });
		}
	}

	if (errors.length > 0) {
		throw new Error(errors.join('\n'));
	}

	if (check) {
		console.log('Skill links are valid.');
		return;
	}

	if (actions.length === 0) {
		console.log('Skill links are already up to date.');
		return;
	}

	for (const action of actions) console.log(action);
};

const parseArgs = (args) => {
	if (args.length === 0) return { mode: 'sync' };
	if (args.length === 1 && args[0] === '--check') return { mode: 'check' };
	if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { mode: 'help' };

	throw new Error(usage);
};

try {
	const args = parseArgs(process.argv.slice(2));

	if (args.mode === 'help') {
		console.log(usage);
	} else if (args.mode === 'check') {
		await syncLinks({ check: true });
	} else {
		await syncLinks({ check: false });
	}
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
