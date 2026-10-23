import { execSync } from 'child_process';

import { getBackendUrl, getFrontendUrl } from './utils/url-helper';

function globalTeardown() {
	console.log('🧹 Starting global teardown...');

	// Ports this run actually used (they may differ from the defaults, e.g. the
	// alt-port dev-server smoke runs the backend on 5699). A portless URL means
	// 80/443, never a dev server this run started. Killing nothing beats falling
	// back to the defaults, which are most likely the developer's own servers.
	const ports = [
		...new Set(
			[getBackendUrl(), getFrontendUrl()]
				.filter((url): url is string => !!url && URL.canParse(url))
				.map((url) => new URL(url).port)
				.filter(Boolean),
		),
	];

	for (const port of ports) {
		try {
			// `lsof -ti` returns one PID per line. Dev-mode n8n holds the port
			// from multiple PIDs (parent + worker), so split and space-join
			// before passing to `kill` — otherwise the second PID lands on its
			// own shell line and gets executed as a command.
			const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf-8' })
				.trim()
				.split('\n')
				.filter(Boolean);

			if (pids.length > 0) {
				console.log(`- Killing process(es) ${pids.join(', ')} on port ${port}`);
				execSync(`kill -9 ${pids.join(' ')}`);
			}
		} catch (error) {
			// lsof returns non-zero exit code if no process is found
			console.log(`- No process found on port ${port}`);
		}
	}

	console.log('🏁 Global teardown completed');
}

// eslint-disable-next-line import-x/no-default-export
export default globalTeardown;
