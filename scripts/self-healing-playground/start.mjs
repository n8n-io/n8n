import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const cli = new URL('../../packages/cli/', import.meta.url);
const require = createRequire(new URL('package.json', cli));
require('dotenv').config({
	path: fileURLToPath(new URL('../../.agent-setup/self-healing-local.env', import.meta.url)),
	quiet: true,
});
process.argv[1] = fileURLToPath(new URL('bin/n8n', cli));
process.chdir(fileURLToPath(new URL('bin/', cli)));
require('dotenv').config({ quiet: true });

// This launcher is only for the local playground on this throwaway branch.
process.env.N8N_LISTEN_ADDRESS = '127.0.0.1';
process.env.N8N_PORT ??= '5698';
process.env.N8N_RUNNERS_BROKER_PORT ??= '15978';
process.env.N8N_SECURE_COOKIE = 'false';
process.env.N8N_USER_FOLDER ??= fileURLToPath(
	new URL('../../.agent-setup/self-healing-local/', import.meta.url),
);
process.env.N8N_ENABLED_MODULES = [
	...new Set([
		...(process.env.N8N_ENABLED_MODULES ?? '').split(',').filter(Boolean),
		'instance-ai',
		'inbox',
	]),
].join(',');
process.env.N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED = 'true';

require('reflect-metadata');
require(fileURLToPath(new URL('dist/config/index.js', cli)));
const { License } = require(fileURLToPath(new URL('dist/license.js', cli)));
const { LICENSE_FEATURES, LICENSE_QUOTAS } = require('@n8n/constants');
const projectFeatures = new Set([
	LICENSE_FEATURES.SHARING,
	LICENSE_FEATURES.PROJECT_ROLE_ADMIN,
	LICENSE_FEATURES.PROJECT_ROLE_EDITOR,
	LICENSE_FEATURES.PROJECT_ROLE_VIEWER,
]);
const isLicensed = License.prototype.isLicensed;
const getValue = License.prototype.getValue;
License.prototype.isLicensed = function (feature) {
	return projectFeatures.has(feature) || isLicensed.call(this, feature);
};
License.prototype.getValue = function (feature) {
	if (feature === LICENSE_QUOTAS.TEAM_PROJECT_LIMIT) return 1;
	return getValue.call(this, feature);
};

const { Container } = require('@n8n/di');
const { EventService } = require('@n8n/backend-services');
const { UserRepository, ProjectRepository } = require('@n8n/db');
const { ProjectService } = require(
	fileURLToPath(new URL('dist/services/project.service.ee.js', cli)),
);
async function ensureAssistantSetup() {
	const { InstanceAiSettingsService } = require(
		fileURLToPath(new URL('dist/modules/instance-ai/instance-ai-settings.service.js', cli)),
	);
	const settings = Container.get(InstanceAiSettingsService);
	if (await settings.isSetupCompleted()) return;
	const current = await settings.getAdminSettings();
	if (
		(await settings.isModelConfigured()) &&
		settings.getSandboxStatus().workflowBuilderAvailable &&
		!current.searchEnvConfigured &&
		!current.searchCredentialId &&
		!current.searchDisabled
	) {
		// Local test workflows do not need web search. Settle the chat setup gate.
		await settings.updateAdminSettings({ searchDisabled: true });
		const { ModuleRegistry } = require('@n8n/backend-common');
		await Container.get(ModuleRegistry).refreshModuleSettings('instance-ai');
		console.log(`Playground Assistant setup complete: ${await settings.isSetupCompleted()}`);
	}
}
let creating = false;
async function ensureProject() {
	if (creating) return;
	creating = true;
	try {
		await ensureAssistantSetup();
		const { FrontendService } = require(
			fileURLToPath(new URL('dist/services/frontend.service.js', cli)),
		);
		const moduleSettings = Container.get(FrontendService).getModuleSettings();
		console.log(
			`Playground chat setup ready: ${moduleSettings['instance-ai']?.setupCompleted === true}`,
		);
		const projects = await Container.get(ProjectRepository).findTeamProjects();
		let project = projects.find(({ name }) => name === 'Self-healing test');
		if (!project) {
			const users = await Container.get(UserRepository).findMany({ includeRole: true });
			const owner = users.find((user) => user.role.slug === 'global:owner' && user.email);
			if (!owner) return;
			project = await Container.get(ProjectService).createTeamProject(owner, {
				name: 'Self-healing test',
			});
		}
		console.log(
			`Self-healing settings: http://127.0.0.1:${process.env.N8N_PORT}/projects/${project.id}/settings`,
		);
	} catch (error) {
		console.error('Could not create the playground project:', error);
	} finally {
		creating = false;
	}
}
Container.get(EventService).on('server-started', ensureProject);
Container.get(EventService).on('instance-owner-setup', ensureProject);

require(fileURLToPath(new URL('bin/n8n', cli)));
