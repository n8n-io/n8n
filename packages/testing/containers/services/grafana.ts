import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import memoryDashboard from './grafana-dashboards/n8n-memory.json';
import { PYROSCOPE_PORT } from './pyroscope';
import type { Service, ServiceResult } from './types';

const HOSTNAME = 'grafana';
const GRAFANA_PORT = 3000;
const DASHBOARDS_DIR = '/var/lib/grafana/dashboards';
const MEMORY_DASHBOARD_UID = 'n8n-memory';

/** Placeholder in the dashboard JSON, replaced so cAdvisor panels show only this stack. */
const PROJECT_PLACEHOLDER = '__PROJECT__';

export interface GrafanaMeta {
	uiUrl: string;
	memoryDashboardUrl: string;
}

export type GrafanaResult = ServiceResult<GrafanaMeta>;

const DATASOURCES = `
apiVersion: 1
datasources:
  - name: VictoriaMetrics
    uid: victoria-metrics
    type: prometheus
    access: proxy
    url: http://victoria-metrics:8428
    isDefault: true
  - name: Pyroscope
    uid: pyroscope
    type: grafana-pyroscope-datasource
    access: proxy
    url: http://pyroscope:${PYROSCOPE_PORT}
`;

const DASHBOARD_PROVIDERS = `
apiVersion: 1
providers:
  - name: n8n
    type: file
    options:
      path: ${DASHBOARDS_DIR}
`;

export const grafana: Service<GrafanaResult> = {
	description: 'Grafana',
	dependsOn: ['victoriaMetrics', 'pyroscope'],

	async start(network: StartedNetwork, projectName: string): Promise<GrafanaResult> {
		const dashboard = JSON.stringify(memoryDashboard).replaceAll(PROJECT_PLACEHOLDER, projectName);

		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.grafana)
			.withName(`${projectName}-${HOSTNAME}`)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withEnvironment({
				GF_AUTH_ANONYMOUS_ENABLED: 'true',
				GF_AUTH_ANONYMOUS_ORG_ROLE: 'Admin',
				GF_AUTH_DISABLE_LOGIN_FORM: 'true',
				GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH: `${DASHBOARDS_DIR}/n8n-memory.json`,
				GF_ANALYTICS_REPORTING_ENABLED: 'false',
				GF_ANALYTICS_CHECK_FOR_UPDATES: 'false',
				GF_NEWS_NEWS_FEED_ENABLED: 'false',
			})
			.withCopyContentToContainer([
				{ content: DATASOURCES, target: '/etc/grafana/provisioning/datasources/n8n.yaml' },
				{ content: DASHBOARD_PROVIDERS, target: '/etc/grafana/provisioning/dashboards/n8n.yaml' },
				{ content: dashboard, target: `${DASHBOARDS_DIR}/n8n-memory.json` },
			])
			.withExposedPorts(GRAFANA_PORT)
			.withWaitStrategy(
				Wait.forHttp('/api/health', GRAFANA_PORT).forStatusCode(200).withStartupTimeout(120000),
			)
			.withReuse()
			.start();

		const uiUrl = `http://localhost:${container.getMappedPort(GRAFANA_PORT)}`;

		return {
			container,
			meta: {
				uiUrl,
				memoryDashboardUrl: `${uiUrl}/d/${MEMORY_DASHBOARD_UID}`,
			},
		};
	},
};
