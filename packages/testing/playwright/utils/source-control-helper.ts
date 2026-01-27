import type { GitCommitInfo, SourceControlledFile } from '@n8n/api-types';
import { expect } from '@playwright/test';
import type { GiteaHelper } from 'n8n-containers';

import type { n8nPage } from '../pages/n8nPage';

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

const waitForDisconnected = async (n8n: n8nPage, timeout = 30000) => {
	await expect(async () => {
		const response = await n8n.page.request.get('/rest/source-control/preferences');
		const preferences = await response.json();
		expect(preferences.data?.connected).toBe(false);
	}).toPass({ timeout });
};

const initSourceControlPreferences = async (n8n: n8nPage) => {
	await n8n.page.request.post('/rest/source-control/preferences', {
		data: {
			connectionType: 'ssh',
			keyGeneratorType: 'ed25519',
			repositoryUrl: '', // Clear any existing repo URL to prevent auto-reconnection
			initRepo: false, // Don't initialize repo - this would set connected=true
		},
	});
};

const initSourceControlSSHKey = async ({ n8n, gitea }: { n8n: n8nPage; gitea: GiteaHelper }) => {
	const preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
	const preferences = await preferencesResponse.json();
	const sshKey = preferences.data.publicKey;

	try {
		await gitea.addSSHKey('n8n-source-control', sshKey);
	} catch {
		// Key might already exist in Gitea - this is fine if we're reusing keys
	}
};

export const initSourceControl = async ({ n8n, gitea }: { n8n: n8nPage; gitea: GiteaHelper }) => {
	const preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
	const preferences = await preferencesResponse.json();
	if (preferences.data?.connected) {
		await n8n.api.sourceControl.disconnect({ keepKeyPair: true });
		await waitForDisconnected(n8n);
	}

	await initSourceControlPreferences(n8n);
	await initSourceControlSSHKey({ n8n, gitea });
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

export async function setupGitRepo(n8n: n8nPage, gitea: GiteaHelper): Promise<GitRepoHelper> {
	await initSourceControl({ n8n, gitea });
	const repoName = generateUniqueRepoName();

	await gitea.createRepo(repoName);

	const repoUrl = buildRepoUrl(repoName);
	await n8n.api.sourceControl.connect({ repositoryUrl: repoUrl });

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
