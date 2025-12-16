import type { N8NStack } from 'n8n-containers/n8n-test-container-creation';
import { addGiteaSSHKey } from 'n8n-containers/n8n-test-container-gitea';

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
	await addGiteaSSHKey(sourceControlContainer!, 'n8n-source-control', sshKey);
};

export const initSourceControl = async ({
	n8n,
	n8nContainer,
}: { n8n: n8nPage; n8nContainer: N8NStack }) => {
	await initSourceControlPreferences(n8n);
	await initSourceControlSSHKey({ n8n, n8nContainer });
};
