import { GenericContainer, Wait } from 'testcontainers';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { PostgresResult } from './postgres';
import type { Service, ServiceResult, StartContext } from './types';

const HOSTNAME = 'postgres-exporter';
export const EXPORTER_PORT = 9187;

export interface PostgresExporterMeta {
	host: string;
	port: number;
}

export type PostgresExporterResult = ServiceResult<PostgresExporterMeta>;

/**
 * Postgres-internal stats exposed as Prometheus metrics for VictoriaMetrics.
 * Opt-in via `config.services.postgresExporter` — only useful for benchmarks.
 */
export const postgresExporter: Service<PostgresExporterResult> = {
	description: 'Postgres Exporter',
	dependsOn: ['postgres'],

	async start(
		network: StartedNetwork,
		projectName: string,
		_options?: unknown,
		ctx?: StartContext,
	): Promise<PostgresExporterResult> {
		const pgResult = ctx?.serviceResults.postgres as PostgresResult | undefined;
		if (!pgResult) {
			throw new Error('Postgres service must start before postgres-exporter');
		}

		const { username, password, database } = pgResult.meta;
		const dsn = `postgresql://${username}:${password}@postgres:5432/${database}?sslmode=disable`;

		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.postgresExporter)
			.withName(`${projectName}-${HOSTNAME}`)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withEnvironment({
				DATA_SOURCE_NAME: dsn,
			})
			.withExposedPorts(EXPORTER_PORT)
			// stat_bgwriter collector is off by default in v0.17.x.
			.withCommand(['--collector.stat_bgwriter'])
			.withWaitStrategy(
				Wait.forHttp('/metrics', EXPORTER_PORT).forStatusCode(200).withStartupTimeout(30000),
			)
			.withReuse()
			.start();

		return {
			container,
			meta: {
				host: HOSTNAME,
				port: EXPORTER_PORT,
			},
		};
	},
};
