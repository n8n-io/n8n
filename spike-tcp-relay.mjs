// Throwaway spike-only TCP relay: host port -> docker exec into the nested
// runner-dind daemon -> the sandbox container's internal IP:port. Stands in
// for the port-proxy infrastructure that plan.md Phase 7 says doesn't exist
// yet — this is a hack to prove reachability is possible, not a design for
// the real feature.
import net from 'node:net';
import { spawn } from 'node:child_process';

const LOCAL_PORT = Number(process.argv[2] ?? 5199);
const RUNNER_CONTAINER = process.argv[3] ?? 'n8n-sandbox-service-runner-dind-local-1';
const TARGET_IP = process.argv[4] ?? '172.18.0.2';
const TARGET_PORT = process.argv[5] ?? '5173';

const server = net.createServer((clientSocket) => {
	const proc = spawn('docker', ['exec', '-i', RUNNER_CONTAINER, 'nc', TARGET_IP, TARGET_PORT]);
	clientSocket.pipe(proc.stdin);
	proc.stdout.pipe(clientSocket);
	proc.stderr.on('data', (d) => process.stderr.write(`[nc stderr] ${d}`));
	clientSocket.on('close', () => proc.kill());
	proc.on('close', () => clientSocket.destroy());
	proc.on('error', (err) => {
		console.error('proc error:', err);
		clientSocket.destroy();
	});
});

server.listen(LOCAL_PORT, () => {
	console.log(`Relaying localhost:${LOCAL_PORT} -> ${RUNNER_CONTAINER} -> ${TARGET_IP}:${TARGET_PORT}`);
});
