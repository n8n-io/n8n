import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult, StartContext } from './types';
import type { VictoriaLogsResult } from './victoria-logs';

const VICTORIA_LOGS_HOSTNAME = 'victoria-logs';
const VICTORIA_LOGS_HTTP_PORT = 9428;

function generateVectorConfig(projectName: string, victoriaLogsEndpoint: string): string {
	return `
# Disable healthcheck to allow Vector to start while Docker socket becomes available
[healthchecks]
enabled = false

[sources.docker_logs]
type = "docker_logs"
include_labels = ["com.docker.compose.project=${projectName}"]

[transforms.format_for_victorialogs]
type = "remap"
inputs = ["docker_logs"]
source = '''
._msg = .message
._time = .timestamp
.project = "${projectName}"
.service = .label."com.docker.compose.service" || "unknown"
.container = .container_name || "unknown"
._stream = .stream || "unknown"
del(.message)
del(.timestamp)
del(.label)
del(.source_type)
del(.stream)
'''

[sinks.victoria_logs]
type = "http"
inputs = ["format_for_victorialogs"]
uri = "${victoriaLogsEndpoint}/insert/jsonline"
method = "post"
framing.method = "newline_delimited"
encoding.codec = "json"
`;
}

export type VectorResult = ServiceResult<Record<string, never>>;

export const vector: Service<VectorResult> = {
	description: 'Vector log collector',
	dependsOn: ['victoriaLogs'],

	async start(
		network: StartedNetwork,
		projectName: string,
		_config?: unknown,
		ctx?: StartContext,
	): Promise<VectorResult> {
		// Get the VictoriaLogs internal endpoint from the already-started service
		const victoriaLogsResult = ctx?.serviceResults.victoriaLogs as VictoriaLogsResult | undefined;
		const logsInternalEndpoint =
			victoriaLogsResult?.meta.internalEndpoint ??
			`http://${VICTORIA_LOGS_HOSTNAME}:${VICTORIA_LOGS_HTTP_PORT}`;

		const vectorConfig = generateVectorConfig(projectName, logsInternalEndpoint);

		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.vector)
			.withName(`${projectName}-vector`)
			.withNetwork(network)
			.withNetworkAliases('vector')
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'vector',
			})
			.withBindMounts([
				{
					source: '/var/run/docker.sock',
					target: '/var/run/docker.sock',
					mode: 'ro',
				},
			])
			.withCopyContentToContainer([
				{
					content: vectorConfig,
					target: '/etc/vector/vector.toml',
				},
			])
			.withCommand(['--config', '/etc/vector/vector.toml'])
			.withWaitStrategy(Wait.forLogMessage(/Vector has started/, 1).withStartupTimeout(60000))
			.withReuse()
			.start();

		return {
			container,
			meta: {},
		};
	},
};
