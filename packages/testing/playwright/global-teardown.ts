import { execSync } from 'child_process';

function globalTeardown() {
	console.log('🧹 Starting global teardown...');

	const ports = [5678, 8080];

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
