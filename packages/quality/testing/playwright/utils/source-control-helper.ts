import type { GitCommitInfo, SourceControlledFile } from '@n8n/api-types';
import { expect } from '@playwright/test';
import type { GiteaHelper } from 'n8n-containers';
import { createHash } from 'node:crypto';

import type { n8nPage } from '../pages/n8nPage';
import type { ApiHelpers } from '../services/api-helper';

async function getSourceControlPreferences(api: ApiHelpers) {
	const response = await api.request.get('/rest/source-control/preferences');
	const contentType = response.headers()['content-type'] ?? '';

	if (!contentType.includes('application/json')) {
		throw new Error(
			`Expected source-control preferences JSON, got ${response.status()} ${contentType}. ` +
				'Ensure the test is tagged @licensed and N8N_LICENSE_TENANT_ID/N8N_LICENSE_ACTIVATION_KEY are available so source-control routes are registered at startup.',
		);
	}

	return await response.json();
}

async function waitForCommitOnGitea(
	gitea: GiteaHelper,
	repoName: string,
	commitHash: string,
	timeout = 10000,
	pollInterval = 500,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const exists = await gitea.commitExists(repoName, commitHash);
		if (exists) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, pollInterval));
	}

	throw new Error(`Commit ${commitHash} not found on Gitea repo ${repoName} after ${timeout}ms`);
}

const waitForDisconnected = async (api: ApiHelpers, timeout = 30000) => {
	await expect(async () => {
		const preferences = await getSourceControlPreferences(api);
		expect(preferences.data?.connected).toBe(false);
	}).toPass({ timeout });
};

const initSourceControlPreferences = async (api: ApiHelpers) => {
	await api.request.post('/rest/source-control/preferences', {
		data: {
			connectionType: 'ssh',
			keyGeneratorType: 'ed25519',
			repositoryUrl: '', // Clear any existing repo URL to prevent auto-reconnection
			initRepo: false, // Don't initialize repo - this would set connected=true
		},
	});
};

const initSourceControlSSHKey = async ({ api, gitea }: { api: ApiHelpers; gitea: GiteaHelper }) => {
	const preferences = await getSourceControlPreferences(api);
	const sshKey = preferences.data.publicKey;
	const sshKeyHash = createHash('sha256').update(sshKey).digest('hex').slice(0, 12);

	try {
		await gitea.addSSHKey(`n8n-source-control-${sshKeyHash}`, sshKey);
	} catch {
		// Key might already exist in Gitea - this is fine if we're reusing keys
	}
};

export const initSourceControl = async ({
	n8n,
	api = n8n.api,
	gitea,
}: {
	n8n: n8nPage;
	api?: ApiHelpers;
	gitea: GiteaHelper;
}) => {
	const preferences = await getSourceControlPreferences(api);
	if (preferences.data?.connected) {
		await api.sourceControl.disconnect({ keepKeyPair: true });
		await waitForDisconnected(api);
	}

	await initSourceControlPreferences(api);
	await initSourceControlSSHKey({ api, gitea });
};

export function generateUniqueRepoName(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `n8n-test-${timestamp}-${random}`;
}

export function buildRepoUrl(repoName: string): string {
	return `ssh://git@gitea/giteaadmin/${repoName}.git`;
}

export interface GitRepoHelper {
	repoName: string;
	repoUrl: string;
	pushAndWait(
		n8n: n8nPage,
		commitMessage: string,
	): Promise<{
		files: SourceControlledFile[];
		commit: GitCommitInfo | null;
	}>;
}

export async function setupGitRepo(
	n8n: n8nPage,
	gitea: GiteaHelper,
	api: ApiHelpers = n8n.api,
): Promise<GitRepoHelper> {
	await initSourceControl({ n8n, api, gitea });
	const repoName = generateUniqueRepoName();

	await gitea.createRepo(repoName);

	const repoUrl = buildRepoUrl(repoName);
	await api.sourceControl.connect({ repositoryUrl: repoUrl });

	return {
		repoName,
		repoUrl,
		async pushAndWait(n8nPage: n8nPage, commitMessage: string) {
			const result = await n8nPage.sourceControlPushModal.push(commitMessage);

			if (result.commit?.hash) {
				await waitForCommitOnGitea(gitea, repoName, result.commit.hash);
			}

			return result;
		},
	};
}
