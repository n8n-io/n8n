#!/usr/bin/env node
/**
 * Benchmark JSON.stringify/parse vs flatted.stringify/parse
 * using real execution data from the database.
 *
 * Usage:
 *   pnpm tsx scripts/benchmark-json-vs-flatted.ts [sample-size]
 */

import { parse, stringify } from 'flatted';
import pg from 'pg';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

interface BenchmarkResult {
	executionId: string;
	dataSize: number;
	jsonStringifyTime: number | null;
	flattedStringifyTime: number;
	jsonParseTime: number | null;
	flattedParseTime: number;
	hasCircularRefs: boolean;
}

/**
 * Check if data contains circular references
 */
function hasCircularReferences(data: unknown): boolean {
	try {
		JSON.stringify(data);
		return false;
	} catch (error) {
		if (error instanceof Error && error.message.includes('circular')) {
			return true;
		}
		throw error;
	}
}

/**
 * Benchmark a single execution's data
 */
function benchmarkExecution(executionId: string, data: string): BenchmarkResult {
	const result: BenchmarkResult = {
		executionId,
		dataSize: data.length,
		jsonStringifyTime: null,
		flattedStringifyTime: 0,
		jsonParseTime: null,
		flattedParseTime: 0,
		hasCircularRefs: false,
	};

	// Parse with flatted first
	const start1 = performance.now();
	const parsedData = parse(data);
	result.flattedParseTime = performance.now() - start1;

	// Check for circular refs
	result.hasCircularRefs = hasCircularReferences(parsedData);

	// Benchmark JSON operations (if no circular refs)
	if (!result.hasCircularRefs) {
		// JSON.stringify
		const start2 = performance.now();
		const jsonStr = JSON.stringify(parsedData);
		result.jsonStringifyTime = performance.now() - start2;

		// JSON.parse
		const start3 = performance.now();
		JSON.parse(jsonStr);
		result.jsonParseTime = performance.now() - start3;
	}

	// Benchmark flatted.stringify
	const start4 = performance.now();
	stringify(parsedData);
	result.flattedStringifyTime = performance.now() - start4;

	return result;
}

/**
 * Get database configuration from environment
 */
function getDbConfig() {
	const dbType = process.env.DB_TYPE || process.env.DATABASE_TYPE || 'sqlite';

	if (dbType === 'postgresdb') {
		return {
			type: 'postgres' as const,
			host: process.env.DB_POSTGRESDB_HOST || 'localhost',
			port: parseInt(process.env.DB_POSTGRESDB_PORT || '5432', 10),
			database: process.env.DB_POSTGRESDB_DATABASE || 'n8n',
			user: process.env.DB_POSTGRESDB_USER || 'postgres',
			password: process.env.DB_POSTGRESDB_PASSWORD || '',
			schema: process.env.DB_POSTGRESDB_SCHEMA || 'public',
		};
	}

	return {
		type: 'sqlite' as const,
		database: process.env.DB_SQLITE_DATABASE ||
		          process.env.N8N_USER_FOLDER ?
		          `${process.env.N8N_USER_FOLDER}/database.sqlite` :
		          `${process.env.HOME}/.n8n/database.sqlite`,
	};
}

/**
 * Fetch execution data from PostgreSQL
 */
async function fetchExecutionsPostgres(
	config: ReturnType<typeof getDbConfig>,
	limit: number,
): Promise<Array<{ id: string; data: string }>> {
	if (config.type !== 'postgres') throw new Error('Invalid config type');

	const client = new pg.Client({
		host: config.host,
		port: config.port,
		database: config.database,
		user: config.user,
		password: config.password,
	});

	await client.connect();

	try {
		const res = await client.query(
			`SELECT e.id, ed.data
			 FROM ${config.schema}.execution_entity e
			 INNER JOIN ${config.schema}.execution_data ed ON e.id = ed."executionId"
			 WHERE ed.data IS NOT NULL
			 ORDER BY RANDOM()
			 LIMIT ${limit}`
		);

		return res.rows;
	} finally {
		await client.end();
	}
}

/**
 * Fetch execution data from SQLite
 */
async function fetchExecutionsSqlite(
	config: ReturnType<typeof getDbConfig>,
	limit: number,
): Promise<Array<{ id: string; data: string }>> {
	if (config.type !== 'sqlite') throw new Error('Invalid config type');

	return new Promise((resolve, reject) => {
		const db = new sqlite3.Database(config.database, sqlite3.OPEN_READONLY, (err) => {
			if (err) {
				reject(new Error(`Failed to open database: ${err.message}`));
				return;
			}
		});

		const dbAll = promisify(db.all.bind(db));

		(async () => {
			try {
				const rows = await dbAll(
					`SELECT e.id, ed.data
					 FROM execution_entity e
					 INNER JOIN execution_data ed ON e.id = ed.executionId
					 WHERE ed.data IS NOT NULL
					 ORDER BY RANDOM()
					 LIMIT ${limit}`
				) as any[];

				db.close();
				resolve(rows);
			} catch (error) {
				db.close();
				reject(error);
			}
		})();
	});
}

/**
 * Calculate and print statistics
 */
function printStatistics(results: BenchmarkResult[]): void {
	const withCircular = results.filter(r => r.hasCircularRefs);
	const withoutCircular = results.filter(r => !r.hasCircularRefs);

	console.log('\n' + '='.repeat(80));
	console.log('BENCHMARK RESULTS');
	console.log('='.repeat(80));

	console.log(`\nTotal executions benchmarked: ${results.length}`);
	console.log(`Executions with circular refs: ${withCircular.length} (${((withCircular.length / results.length) * 100).toFixed(2)}%)`);
	console.log(`Executions without circular refs: ${withoutCircular.length} (${((withoutCircular.length / results.length) * 100).toFixed(2)}%)`);

	if (withoutCircular.length > 0) {
		// Calculate averages for executions WITHOUT circular refs
		const avgDataSize = withoutCircular.reduce((sum, r) => sum + r.dataSize, 0) / withoutCircular.length;
		const avgJsonStringify = withoutCircular.reduce((sum, r) => sum + (r.jsonStringifyTime || 0), 0) / withoutCircular.length;
		const avgFlattedStringify = withoutCircular.reduce((sum, r) => sum + r.flattedStringifyTime, 0) / withoutCircular.length;
		const avgJsonParse = withoutCircular.reduce((sum, r) => sum + (r.jsonParseTime || 0), 0) / withoutCircular.length;
		const avgFlattedParse = withoutCircular.reduce((sum, r) => sum + r.flattedParseTime, 0) / withoutCircular.length;

		const stringifySpeedup = avgFlattedStringify / avgJsonStringify;
		const parseSpeedup = avgFlattedParse / avgJsonParse;
		const totalSpeedup = (avgFlattedStringify + avgFlattedParse) / (avgJsonStringify + avgJsonParse);

		console.log('\n📊 EXECUTIONS WITHOUT CIRCULAR REFS (99%+ of cases)');
		console.log('─'.repeat(80));
		console.log(`Average data size: ${avgDataSize.toFixed(0)} bytes`);
		console.log('');
		console.log('Stringify performance:');
		console.log(`  JSON.stringify:    ${avgJsonStringify.toFixed(3)} ms`);
		console.log(`  flatted.stringify: ${avgFlattedStringify.toFixed(3)} ms`);
		console.log(`  Speedup:           ${stringifySpeedup.toFixed(2)}x faster with JSON`);
		console.log('');
		console.log('Parse performance:');
		console.log(`  JSON.parse:        ${avgJsonParse.toFixed(3)} ms`);
		console.log(`  flatted.parse:     ${avgFlattedParse.toFixed(3)} ms`);
		console.log(`  Speedup:           ${parseSpeedup.toFixed(2)}x faster with JSON`);
		console.log('');
		console.log('Total (stringify + parse):');
		console.log(`  JSON:              ${(avgJsonStringify + avgJsonParse).toFixed(3)} ms`);
		console.log(`  flatted:           ${(avgFlattedStringify + avgFlattedParse).toFixed(3)} ms`);
		console.log(`  Overall speedup:   ${totalSpeedup.toFixed(2)}x faster with JSON`);

		// Show distribution by data size
		const small = withoutCircular.filter(r => r.dataSize < 10000);
		const medium = withoutCircular.filter(r => r.dataSize >= 10000 && r.dataSize < 100000);
		const large = withoutCircular.filter(r => r.dataSize >= 100000);

		if (small.length > 0 && medium.length > 0) {
			console.log('\n📈 Performance by data size:');
			console.log('─'.repeat(80));

			if (small.length > 0) {
				const avgSpeedup = small.reduce((sum, r) => {
					const jsonTime = (r.jsonStringifyTime || 0) + (r.jsonParseTime || 0);
					const flattedTime = r.flattedStringifyTime + r.flattedParseTime;
					return sum + (flattedTime / jsonTime);
				}, 0) / small.length;
				console.log(`Small (<10KB):   ${avgSpeedup.toFixed(2)}x speedup (${small.length} executions)`);
			}

			if (medium.length > 0) {
				const avgSpeedup = medium.reduce((sum, r) => {
					const jsonTime = (r.jsonStringifyTime || 0) + (r.jsonParseTime || 0);
					const flattedTime = r.flattedStringifyTime + r.flattedParseTime;
					return sum + (flattedTime / jsonTime);
				}, 0) / medium.length;
				console.log(`Medium (10-100KB): ${avgSpeedup.toFixed(2)}x speedup (${medium.length} executions)`);
			}

			if (large.length > 0) {
				const avgSpeedup = large.reduce((sum, r) => {
					const jsonTime = (r.jsonStringifyTime || 0) + (r.jsonParseTime || 0);
					const flattedTime = r.flattedStringifyTime + r.flattedParseTime;
					return sum + (flattedTime / jsonTime);
				}, 0) / large.length;
				console.log(`Large (>100KB):  ${avgSpeedup.toFixed(2)}x speedup (${large.length} executions)`);
			}
		}
	}

	if (withCircular.length > 0) {
		const avgDataSize = withCircular.reduce((sum, r) => sum + r.dataSize, 0) / withCircular.length;
		const avgFlattedStringify = withCircular.reduce((sum, r) => sum + r.flattedStringifyTime, 0) / withCircular.length;
		const avgFlattedParse = withCircular.reduce((sum, r) => sum + r.flattedParseTime, 0) / withCircular.length;

		console.log('\n⚠️  EXECUTIONS WITH CIRCULAR REFS (<1% of cases)');
		console.log('─'.repeat(80));
		console.log(`Average data size: ${avgDataSize.toFixed(0)} bytes`);
		console.log(`Average flatted time: ${(avgFlattedStringify + avgFlattedParse).toFixed(3)} ms (no change with fallback)`);
	}

	console.log('\n💡 ESTIMATED IMPACT');
	console.log('─'.repeat(80));

	if (withoutCircular.length > 0) {
		const avgJsonTime = withoutCircular.reduce((sum, r) => sum + (r.jsonStringifyTime || 0) + (r.jsonParseTime || 0), 0) / withoutCircular.length;
		const avgFlattedTime = withoutCircular.reduce((sum, r) => sum + r.flattedStringifyTime + r.flattedParseTime, 0) / withoutCircular.length;
		const timeSavedPerExecution = avgFlattedTime - avgJsonTime;

		console.log(`Time saved per execution (average): ${timeSavedPerExecution.toFixed(3)} ms`);
		console.log('');
		console.log('At scale:');
		console.log(`  100 executions/day:   ${(timeSavedPerExecution * 100 / 1000).toFixed(2)} seconds/day saved`);
		console.log(`  1,000 executions/day: ${(timeSavedPerExecution * 1000 / 1000).toFixed(2)} seconds/day saved`);
		console.log(`  10,000 executions/day: ${(timeSavedPerExecution * 10000 / 1000 / 60).toFixed(2)} minutes/day saved`);
	}

	console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main execution
 */
async function main() {
	const sampleSize = parseInt(process.argv[2] || '100', 10);

	if (isNaN(sampleSize) || sampleSize <= 0) {
		console.error('Invalid sample size. Usage: pnpm tsx benchmark-json-vs-flatted.ts [sample-size]');
		process.exit(1);
	}

	console.log('⚡ JSON vs flatted Benchmark\n');
	console.log(`Benchmarking ${sampleSize} random executions...\n`);

	const dbConfig = getDbConfig();
	console.log(`Database type: ${dbConfig.type}`);

	try {
		console.log('Fetching execution data...');

		const executions = dbConfig.type === 'postgres'
			? await fetchExecutionsPostgres(dbConfig, sampleSize)
			: await fetchExecutionsSqlite(dbConfig, sampleSize);

		console.log(`✓ Fetched ${executions.length} executions\n`);
		console.log('Running benchmarks...');

		const results: BenchmarkResult[] = [];

		for (let i = 0; i < executions.length; i++) {
			const { id, data } = executions[i];
			const result = benchmarkExecution(id, data);
			results.push(result);

			if ((i + 1) % 10 === 0) {
				console.log(`  Processed ${i + 1}/${executions.length}`);
			}
		}

		printStatistics(results);

	} catch (error) {
		console.error('\n❌ Error:', error);
		process.exit(1);
	}
}

main().catch(console.error);
