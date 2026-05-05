import { execSync } from 'child_process';

function globalTeardown() {
	console.log('🧹 Starting global teardown...');

	const ports = [5678, 8080];

	for (const port of ports) {
		try {
			// Find process ID using the port
			const pid = execSync(`lsof -ti :${port}`, { encoding: 'utf-8' }).trim();

			if (pid) {
				console.log(`- Killing process ${pid} on port ${port}`);
				execSync(`kill -9 ${pid}`);
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
