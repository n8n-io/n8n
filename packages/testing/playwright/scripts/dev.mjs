#!/usr/bin/env node
/**
 * Run Playwright dev tests with automatic port cleanup on exit
 *
 * This script runs Playwright tests and ensures ports 5678 and 8080
 * are properly cleaned up when the script exits, even on Ctrl+C.
 */

import { $, echo, chalk } from 'zx';
import process from 'node:process';

// Disable verbose mode for cleaner output
$.verbose = false;
process.env.FORCE_COLOR = '1';

// #region ===== Configuration =====

const PORTS = [5678, 8080];
const PORT_NAMES = {
	5678: 'n8n backend',
	8080: 'frontend dev server',
};

const config = {
	env: {
		N8N_BASE_URL: 'http://localhost:5678',
		N8N_EDITOR_URL: 'http://localhost:8080',
		RESET_E2E_DB: 'true',
	},
	projects: ['ui', 'ui:isolated'],
};

// #endregion ===== Configuration =====

// #region ===== Helper Functions =====

/**
 * Find PIDs of processes using the specified port
 * @param {number} port - Port number to check
 * @returns {Promise<string[]>} Array of PIDs
 */
async function findPidsOnPort(port) {
	try {
		const { stdout } = await $`lsof -ti:${port}`;
		return stdout.trim().split('\n').filter(Boolean);
	} catch {
		// No process found on this port
		return [];
	}
}

/**
 * Kill a process by PID
 * @param {string} pid - Process ID to kill
 * @returns {Promise<boolean>} True if successful
 */
async function killProcess(pid) {
	try {
		await $`kill -9 ${pid}`;
		return true;
	} catch {
		return false;
	}
}

/**
 * Clean up processes on specified ports
 * @returns {Promise<void>}
 */
async function cleanupPorts() {
	echo('');
	echo(chalk.blue('🧹 Cleaning up ports 5678 and 8080...'));

	for (const port of PORTS) {
		const pids = await findPidsOnPort(port);
		const portName = PORT_NAMES[port];

		if (pids.length > 0) {
			for (const pid of pids) {
				const success = await killProcess(pid);
				if (success) {
					echo(chalk.gray(`  Killed ${portName} process (PID: ${pid})`));
				}
			}
			echo(chalk.green(`  ✓ Port ${port} cleared`));
		} else {
			echo(chalk.gray(`  ✓ Port ${port} is already free`));
		}
	}

	echo(chalk.green('✨ Cleanup completed'));
}

// #endregion ===== Helper Functions =====

// #region ===== Main Process =====

let isCleaningUp = false;

/**
 * Handle cleanup on exit
 */
async function handleExit(exitCode = 0) {
	if (isCleaningUp) return;
	isCleaningUp = true;

	await cleanupPorts();
	process.exit(exitCode);
}

/**
 * Run Playwright tests with cleanup handlers
 */
async function main() {
	echo(chalk.blue.bold('🚀 Starting Playwright dev tests...'));
	echo(chalk.gray('-'.repeat(47)));

	// Set up signal handlers for graceful shutdown
	process.on('SIGINT', async () => {
		echo(chalk.yellow('\n⚠️  Received SIGINT (Ctrl+C)'));
		await handleExit(130);
	});

	process.on('SIGTERM', async () => {
		echo(chalk.yellow('\n⚠️  Received SIGTERM'));
		await handleExit(143);
	});

	try {
		// Run Playwright with environment variables
		const projectArgs = config.projects.flatMap((p) => ['--project', p]);

		await $({
			env: {
				...process.env,
				...config.env,
			},
			stdio: 'inherit',
		})`playwright test ${projectArgs} --ui`;

		// Tests completed successfully
		await handleExit(0);
	} catch (error) {
		// Tests failed or were interrupted
		const exitCode = error.exitCode ?? 1;
		await handleExit(exitCode);
	}
}

// #endregion ===== Main Process =====

main().catch(async (error) => {
	echo(chalk.red(`Unexpected error: ${error.message}`));
	await handleExit(1);
});
