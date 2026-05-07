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
 * Runs a Prometheus-compatible exporter that scrapes PostgreSQL internal statistics
 * (connections, transactions, replication lag, etc.) and exposes them as metrics on /metrics.
 * VictoriaMetrics scrapes this endpoint to make Postgres performance data queryable via PromQL.
 * Opt-in only: include `postgresExporter` in `config.services` (e.g. for benchmark profiles).
 * E2E correctness tests don't need this and shouldn't pay the ~1.3s startup + extra container.
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
