import type { ExecOptions } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { execAsync, k3s } = vi.hoisted(() => ({
	execAsync: vi.fn<(command: string, options: ExecOptions) => Promise<{ stdout: string }>>(),
	k3s: {
		exec: vi.fn().mockResolvedValue({ exitCode: 0, output: '' }),
		getMappedPort: vi.fn().mockReturnValue(30080),
		getKubeConfig: vi.fn().mockReturnValue('current-context: default\n'),
		stop: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock('node:child_process', async () => {
	const { promisify } = await import('node:util');
	return {
		exec: Object.assign(vi.fn(), { [promisify.custom]: execAsync }),
		execSync: vi.fn().mockReturnValue(''),
	};
});

vi.mock('node:os', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:os')>()),
	homedir: vi.fn(),
}));

vi.mock('@testcontainers/k3s', () => ({
	K3sContainer: class {
		withName = vi.fn().mockReturnThis();
		withLabels = vi.fn().mockReturnThis();
		withExposedPorts = vi.fn().mockReturnThis();
		withStartupTimeout = vi.fn().mockReturnThis();
		start = vi.fn().mockResolvedValue(k3s);
	},
}));

import { createHelmStack } from '../helm-stack';

describe('Helm stack licensing', () => {
	let testHome: string;
	let chartDir: string;
	let certificatePath: string;
	let certificate: string;
	let certificateMode: number;
	let failSecretCreation: boolean;

	beforeEach(() => {
		vi.clearAllMocks();
		testHome = mkdtempSync(join(os.tmpdir(), 'helm-stack-test-'));
		chartDir = '';
		certificatePath = '';
		certificate = '';
		certificateMode = 0;
		failSecretCreation = false;
		vi.mocked(os.homedir).mockReturnValue(testHome);
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
		vi.stubEnv('N8N_LICENSE_CERT', undefined);
		vi.stubEnv('N8N_LICENSE_ACTIVATION_KEY', undefined);
		vi.stubEnv('N8N_LICENSE_TENANT_ID', undefined);
		execAsync.mockReset();
		execAsync.mockImplementation(async (command) => {
			const downloadDir = /tar xz -C "([^"]+)"/.exec(command)?.[1];
			if (downloadDir) {
				chartDir = downloadDir;
				for (const dir of ['examples', 'ci/install']) {
					const path = join(chartDir, 'charts/n8n', dir);
					mkdirSync(path, { recursive: true });
					for (const example of ['standalone', 'minimal']) {
						writeFileSync(join(path, `${example}.yaml`), '{}');
					}
				}
			}
			const secretFile = /--from-file=certificate="([^"]+)"/.exec(command)?.[1];
			if (secretFile) {
				certificatePath = secretFile;
				certificate = readFileSync(secretFile, 'utf8');
				certificateMode = statSync(secretFile).mode & 0o777;
				if (failSecretCreation) throw new Error('Secret creation failed');
			}
			return { stdout: '' };
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		rmSync(testHome, { recursive: true, force: true });
		if (chartDir) rmSync(chartDir, { recursive: true, force: true });
	});

	test.each(['standalone', 'minimal'])(
		'passes a certificate-only licence to %s',
		async (example) => {
			const licenseCert = 'test-certificate\nwith "quotes", commas, and $characters';
			vi.stubEnv('N8N_LICENSE_CERT', licenseCert);

			const stack = await createHelmStack({ example });

			expect(certificate).toBe(licenseCert);
			expect(certificateMode).toBe(0o600);
			expect(existsSync(certificatePath)).toBe(false);
			const commands = execAsync.mock.calls.map(([command]) => command);
			expect(commands).toContainEqual(
				expect.stringContaining('kubectl create secret generic n8n-license-cert'),
			);
			expect(commands).toContainEqual(
				expect.stringMatching(
					/helm install .*--set env\.shared\.N8N_LICENSE_CERT\.secretKeyRef\.name=n8n-license-cert .*--set env\.shared\.N8N_LICENSE_CERT\.secretKeyRef\.key=certificate/,
				),
			);
			expect(commands.join('\n')).not.toContain(licenseCert);
			expect(vi.mocked(console.log).mock.calls.flat().join('\n')).not.toContain(licenseCert);

			await stack.stop();
		},
	);

	test('installs without a certificate reference when no certificate is set', async () => {
		const stack = await createHelmStack();

		const commands = execAsync.mock.calls.map(([command]) => command);
		expect(commands.join('\n')).not.toContain('n8n-license-cert');
		expect(commands.join('\n')).not.toContain('N8N_LICENSE_CERT');

		await stack.stop();
	});

	test('keeps an explicit pod environment override', async () => {
		vi.stubEnv('N8N_LICENSE_CERT', 'host-certificate');

		const stack = await createHelmStack({ env: { N8N_LICENSE_CERT: '' } });

		const installCommand = execAsync.mock.calls.find(([command]) =>
			command.startsWith('helm install '),
		)?.[0];
		expect(installCommand).toContain('--set-string env.shared.N8N_LICENSE_CERT=');
		expect(installCommand).not.toContain('N8N_LICENSE_CERT.secretKeyRef');

		await stack.stop();
	});

	test('removes the certificate file when Secret creation fails', async () => {
		vi.stubEnv('N8N_LICENSE_CERT', 'test-certificate');
		failSecretCreation = true;

		await expect(createHelmStack()).rejects.toThrow('Secret creation failed');

		expect(certificate).toBe('test-certificate');
		expect(existsSync(certificatePath)).toBe(false);
		expect(execAsync.mock.calls.some(([command]) => command.startsWith('helm install '))).toBe(
			false,
		);
		expect(k3s.stop).toHaveBeenCalled();
	});
});
