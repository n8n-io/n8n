import { isRecord } from '@n8n/utils/is-record';
import { expect, test } from '@playwright/test';
import jwt from 'jsonwebtoken';
import type { N8NStack } from 'n8n-containers/stack';
import { nanoid } from 'nanoid';

import { assertN8nImage, type DeploymentProbe, runDeploymentCell } from './probe';

type StackContainer = N8NStack['containers'][number];

interface ContainerEnvState {
	hasEncryptionKey: boolean;
	keyFile: string | null;
	executionsMode: string | null;
}

interface CredentialProbeResult {
	executionId: string;
	secret: string;
	nonce: string;
	signedToken: string;
}

const ENCRYPTION_KEY_FILE = '/tmp/n8n-encryption-key';

async function runJwtSigningWorkflow(probe: DeploymentProbe): Promise<CredentialProbeResult> {
	const token = nanoid(10);
	const credentialName = `Deployment Probe JWT (${token})`;
	const secret = `jwt-secret-${nanoid(16)}`;
	const nonce = nanoid(12);
	const webhookId = nanoid(12);
	const webhookPath = `probe-key-file-${nanoid(8).toLowerCase()}`;

	const credential = await probe.createCredential({
		name: credentialName,
		type: 'jwtAuth',
		data: {
			keyType: 'passphrase',
			secret,
			algorithm: 'HS256',
		},
	});

	const { id: workflowId, versionId } = await probe.createWorkflow({
		name: `Deployment Probe Encryption Key File (${token})`,
		active: false,
		nodes: [
			{
				id: 'webhook',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId,
				parameters: {
					httpMethod: 'GET',
					path: webhookPath,
					responseMode: 'lastNode',
					responseData: 'firstEntryJson',
					options: {},
				},
			},
			{
				id: 'jwt',
				name: 'JWT',
				type: 'n8n-nodes-base.jwt',
				typeVersion: 1,
				position: [220, 0],
				parameters: {
					operation: 'sign',
					useJson: true,
					claimsJson: '={{ JSON.stringify({ nonce: $json.query.nonce }) }}',
					options: {},
				},
				credentials: {
					jwtAuth: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'JWT', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	});

	await probe.activateWorkflow(workflowId, versionId);

	const response = await probe.triggerWebhook(webhookPath, { query: { nonce } });
	const text = await response.text();
	if (!response.ok()) {
		throw new Error(
			`Encryption key file webhook failed (${response.status()}): ${text.slice(0, 400)}`,
		);
	}
	const body: unknown = JSON.parse(text);
	const signedToken = isRecord(body) && typeof body.token === 'string' ? body.token : '';
	if (!signedToken) {
		throw new Error(`JWT node returned no signed token: ${text.slice(0, 400)}`);
	}

	const execution = await probe.readExecution(workflowId);
	return {
		executionId: execution.executionId,
		secret,
		nonce,
		signedToken,
	};
}

async function readContainerEnv(container: StackContainer): Promise<ContainerEnvState> {
	const result = await container.exec([
		'node',
		'-e',
		'process.stdout.write(JSON.stringify({ hasEncryptionKey: Object.hasOwn(process.env, "N8N_ENCRYPTION_KEY"), keyFile: process.env.N8N_ENCRYPTION_KEY_FILE ?? null, executionsMode: process.env.EXECUTIONS_MODE ?? null }))',
	]);
	if (result.exitCode !== 0) {
		throw new Error(`Container env check failed on ${container.getName()}: ${result.output}`);
	}
	const parsed: unknown = JSON.parse(result.output);
	if (!isRecord(parsed)) {
		throw new Error(`Unexpected env probe output on ${container.getName()}: ${result.output}`);
	}
	return {
		hasEncryptionKey: parsed.hasEncryptionKey === true,
		keyFile: typeof parsed.keyFile === 'string' ? parsed.keyFile : null,
		executionsMode: typeof parsed.executionsMode === 'string' ? parsed.executionsMode : null,
	};
}

async function readContainerLogsUntil(
	container: StackContainer,
	expectedSubstring: string,
	timeoutMs = 5_000,
): Promise<string> {
	const stream = await container.logs();
	let logs = '';
	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => {
			stream.destroy();
			resolve();
		}, timeoutMs);
		stream.on('data', (chunk: Buffer | string) => {
			logs += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
			if (logs.includes(expectedSubstring)) {
				clearTimeout(timer);
				stream.destroy();
				resolve();
			}
		});
		stream.on('end', () => {
			clearTimeout(timer);
			resolve();
		});
		stream.on('error', (error: Error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
	return logs;
}

function verifySignedNonce(signedToken: string, secret: string): string {
	const verified: unknown = jwt.verify(signedToken, secret, { algorithms: ['HS256'] });
	if (!isRecord(verified) || typeof verified.nonce !== 'string') {
		throw new Error(`Verified JWT payload missing nonce claim: ${JSON.stringify(verified)}`);
	}
	return verified.nonce;
}

test(
	'Encryption key from file in queue mode',
	{
		tag: '@cell:ENV-17',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		const encryptionKey = `file-encryption-key-${nanoid(16)}`;

		await runDeploymentCell({
			stack: {
				workers: 1,
				files: [{ target: ENCRYPTION_KEY_FILE, content: encryptionKey }],
				env: {
					N8N_ENCRYPTION_KEY_FILE: ENCRYPTION_KEY_FILE,
				},
				unsetEnv: ['N8N_ENCRYPTION_KEY'],
			},
			probe: async ({ probe }) => await runJwtSigningWorkflow(probe),
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				const main = stack.findContainers(/-n8n(-main-1)?$/)[0];
				const worker = stack.findContainers(/-n8n-worker-1$/)[0];
				expect(main, 'Expected a main n8n container in the stack').toBeDefined();
				expect(worker, 'Expected a worker n8n container in the stack').toBeDefined();

				const mainEnv = await readContainerEnv(main);
				const workerEnv = await readContainerEnv(worker);

				expect(
					mainEnv.hasEncryptionKey,
					'Expected N8N_ENCRYPTION_KEY to be absent in main container env',
				).toBe(false);
				expect(
					workerEnv.hasEncryptionKey,
					'Expected N8N_ENCRYPTION_KEY to be absent in worker container env',
				).toBe(false);
				expect(mainEnv.keyFile, 'Expected N8N_ENCRYPTION_KEY_FILE on main').toBe(
					ENCRYPTION_KEY_FILE,
				);
				expect(workerEnv.keyFile, 'Expected N8N_ENCRYPTION_KEY_FILE on worker').toBe(
					ENCRYPTION_KEY_FILE,
				);
				expect(mainEnv.executionsMode, 'Expected main to run in queue mode').toBe('queue');
				expect(workerEnv.executionsMode, 'Expected worker to run in queue mode').toBe('queue');

				expect(
					verifySignedNonce(probeOutput.signedToken, probeOutput.secret),
					'Expected worker to decrypt the credential and sign the webhook nonce',
				).toBe(probeOutput.nonce);

				const expectedWorkerLog = `Worker finished execution ${probeOutput.executionId}`;
				const workerLogs = await readContainerLogsUntil(worker, expectedWorkerLog);
				expect(
					workerLogs,
					`Expected worker logs to record execution ${probeOutput.executionId}`,
				).toContain(expectedWorkerLog);
			},
		});
	},
);
