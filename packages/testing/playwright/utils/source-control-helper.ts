import type { N8NStack } from 'n8n-containers/n8n-test-container-creation';
import { addGiteaRepo, addGiteaSSHKey } from 'n8n-containers/n8n-test-container-gitea';

import type { n8nPage } from '../pages/n8nPage';

const initSourceControlPreferences = async (n8n: n8nPage) => {
	await n8n.page.request.post('/rest/source-control/preferences', {
		data: {
			connectionType: 'ssh',
			keyGeneratorType: 'ed25519',
		},
	});
};

const initSourceControlSSHKey = async ({
	n8n,
	n8nContainer,
}: { n8n: n8nPage; n8nContainer: N8NStack }) => {
	const preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
	const preferences = await preferencesResponse.json();
	const sshKey = preferences.data.publicKey;

	const sourceControlContainer = n8nContainer.containers.find((c) => c.getName().includes('gitea'));
	try {
		await addGiteaSSHKey(sourceControlContainer!, 'n8n-source-control', sshKey);
	} catch {
		// Key might already exist in Gitea - this is fine if we're reusing keys
	}
};

/**
 * initialize source control preferences and SSH key
 * Will disconnect first if already connected to ensure clean state
 */
export const initSourceControl = async ({
	n8n,
	n8nContainer,
}: { n8n: n8nPage; n8nContainer: N8NStack }) => {
	const preferencesResponse = await n8n.page.request.get('/rest/source-control/preferences');
	const preferences = await preferencesResponse.json();
	if (preferences.data?.connected) {
		await n8n.api.sourceControl.disconnect({ keepKeyPair: true });
	}

	await initSourceControlPreferences(n8n);
	await initSourceControlSSHKey({ n8n, n8nContainer });
};

export function generateUniqueRepoName(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `n8n-test-${timestamp}-${random}`;
}

export function buildRepoUrl(repoName: string): string {
	return `ssh://git@gitea/giteaadmin/${repoName}.git`;
}

/**
 * Create unique repo in gitea with branches and connect via API
 */
export async function setupGitRepo(n8n: n8nPage, n8nContainer: N8NStack): Promise<string> {
	await initSourceControl({ n8n, n8nContainer });
	const repoName = generateUniqueRepoName();

	const giteaContainer = n8nContainer.containers.find((c) => c.getName().includes('gitea'));
	await addGiteaRepo(giteaContainer!, repoName, 'giteaadmin', 'giteapassword');

	const repoUrl = buildRepoUrl(repoName);
	await n8n.api.sourceControl.connect({ repositoryUrl: repoUrl });

	return repoUrl;
}
