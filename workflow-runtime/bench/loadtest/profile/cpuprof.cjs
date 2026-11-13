// A CPU profile of a window of a Node.js process's life, for the fallback
// host and its workers. Load it with NODE_OPTIONS=--require=<this file>.
// The first SIGUSR2 starts the profile; the second stops it and writes
// <LT_CPUPROF_DIR>/<pid>.cpuprofile. Without LT_CPUPROF_DIR it does nothing.
//
//   LT_CPUPROF_DIR  folder of the profiles
//   LT_CPUPROF_US   sampling interval in microseconds (default 1000)
//
// `node --cpu-prof` writes only at a clean exit and covers start-up too.
'use strict';

const dir = process.env.LT_CPUPROF_DIR;
if (dir) {
	const fs = require('node:fs');
	const path = require('node:path');
	const inspector = require('node:inspector');
	const session = new inspector.Session();
	session.connect();
	const post = (method, params) =>
		new Promise((resolve, reject) => session.post(method, params ?? {}, (err, res) => (err ? reject(err) : resolve(res))));
	let running = false;
	process.on('SIGUSR2', async () => {
		try {
			if (!running) {
				running = true;
				await post('Profiler.enable');
				await post('Profiler.setSamplingInterval', { interval: Number(process.env.LT_CPUPROF_US ?? 1000) });
				await post('Profiler.start');
			} else {
				running = false;
				const { profile } = await post('Profiler.stop');
				fs.mkdirSync(dir, { recursive: true });
				fs.writeFileSync(path.join(dir, `${process.pid}.cpuprofile`), JSON.stringify(profile));
			}
		} catch (e) {
			process.stderr.write(`cpuprof: ${e.message}\n`);
		}
	});
}
