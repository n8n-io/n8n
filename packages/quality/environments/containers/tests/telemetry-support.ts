import { once } from 'node:events';
import { createServer, type IncomingMessage, type Server } from 'node:http';

type TelemetryPayload = {
	attempt_id?: unknown;
	success?: unknown;
	failure_phase?: unknown;
	stages?: unknown;
	metrics?: Array<{
		metric_name?: unknown;
		dimensions?: Record<string, unknown>;
	}>;
};

export type TelemetryRequest = {
	authorization: string | undefined;
	payload: TelemetryPayload;
};

export type TelemetryContractServer = {
	url: string;
	requests: TelemetryRequest[];
	close: () => Promise<void>;
};

async function readBody(request: IncomingMessage): Promise<string> {
	let body = '';
	request.setEncoding('utf8');
	for await (const chunk of request) body += chunk;
	return body;
}

function isValidPayload(payload: TelemetryPayload): boolean {
	if (typeof payload.attempt_id !== 'string' || !Array.isArray(payload.stages)) return false;
	return Boolean(
		payload.metrics?.some(
			(metric) =>
				metric.metric_name === 'stack-startup-stage' &&
				metric.dimensions?.attempt_id === payload.attempt_id,
		),
	);
}

export async function startTelemetryContractServer(
	responseStatus = 200,
): Promise<TelemetryContractServer> {
	const requests: TelemetryRequest[] = [];
	const server: Server = createServer(async (request, response) => {
		const body = await readBody(request);
		let payload: TelemetryPayload;
		try {
			payload = JSON.parse(body) as TelemetryPayload;
		} catch {
			response.writeHead(400).end('Invalid JSON');
			return;
		}

		requests.push({ authorization: request.headers.authorization, payload });
		const status = isValidPayload(payload) ? responseStatus : 400;
		response.writeHead(status, { 'Content-Type': 'application/json' }).end('{}');
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Missing telemetry server address');

	return {
		url: `http://127.0.0.1:${address.port}/metrics`,
		requests,
		close: async () => {
			const closed = once(server, 'close');
			server.close();
			server.closeAllConnections();
			await closed;
		},
	};
}
