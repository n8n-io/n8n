import type { n8nPage } from '../pages/n8nPage';

export const initSourceControlPreferences = async (n8n: n8nPage) => {
	await n8n.page.request.post('/rest/source-control/preferences', {
		data: {
			connectionType: 'ssh',
			keyGeneratorType: 'ed25519',
		},
	});
};
