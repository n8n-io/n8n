#!/usr/bin/env node
/**
 * Simple script to analyze execution data for circular references.
 *
 * This connects directly to the database and samples execution data
 * to determine what percentage contains circular references.
 *
 * Usage:
 *   # Run with default sample size (1000)
 *   pnpm tsx scripts/analyze-circular-refs-simple.ts
 *
 *   # Run with custom sample size
 *   pnpm tsx scripts/analyze-circular-refs-simple.ts 500
 *
 *   # Analyze all executions
 *   pnpm tsx scripts/analyze-circular-refs-simple.ts all
 */

import { parse } from 'flatted';
import pg from 'pg';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

interface AnalysisResult {
	total: number;
	hasCircularRefs: number;
	canSerializeWithJSON: number;
	errors: string[];
	sampleExecutionIds: string[];
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

	// Default to SQLite
	return {
		type: 'sqlite' as const,
		database: process.env.DB_SQLITE_DATABASE ||
		          process.env.N8N_USER_FOLDER ?
		          `${process.env.N8N_USER_FOLDER}/database.sqlite` :
		          `${process.env.HOME}/.n8n/database.sqlite`,
	};
}

/**
 * Analyze execution data from PostgreSQL
 */
async function analyzePostgres(
	config: ReturnType<typeof getDbConfig>,
	sampleSize: number | 'all',
): Promise<AnalysisResult> {
	if (config.type !== 'postgres') throw new Error('Invalid config type');

	const client = new pg.Client({
		host: config.host,
		port: config.port,
		database: config.database,
		user: config.user,
		password: config.password,
	});

	await client.connect();
	console.log('✓ Connected to PostgreSQL database\n');

	const result: AnalysisResult = {
		total: 0,
		hasCircularRefs: 0,
		canSerializeWithJSON: 0,
		errors: [],
		sampleExecutionIds: [],
	};

	try {
		// Get total count
		const countRes = await client.query(
			`SELECT COUNT(*) as count FROM ${config.schema}.execution_entity`
		);
		const totalCount = parseInt(countRes.rows[0].count, 10);

		console.log(`Found ${totalCount} executions in database`);

		// Determine how many to analyze
		const limit = sampleSize === 'all' ? totalCount : Math.min(sampleSize, totalCount);
		console.log(`Analyzing ${limit} executions...\n`);

		// Fetch execution data with random sampling
		const query = sampleSize === 'all'
			? `SELECT e.id, ed.data
			   FROM ${config.schema}.execution_entity e
			   INNER JOIN ${config.schema}.execution_data ed ON e.id = ed."executionId"
			   WHERE ed.data IS NOT NULL
			   ORDER BY e.id DESC`
			: `SELECT e.id, ed.data
			   FROM ${config.schema}.execution_entity e
			   INNER JOIN ${config.schema}.execution_data ed ON e.id = ed."executionId"
			   WHERE ed.data IS NOT NULL
			   ORDER BY RANDOM()
			   LIMIT ${limit}`;

		const execRes = await client.query(query);

		for (const row of execRes.rows) {
			try {
				result.total++;

				// Parse the flatted data
				const parsedData = parse(row.data);

				// Check if it has circular references
				if (hasCircularReferences(parsedData)) {
					result.hasCircularRefs++;
					result.sampleExecutionIds.push(row.id);
				} else {
					result.canSerializeWithJSON++;
				}

				if (result.total % 100 === 0) {
					const percentage = ((result.total / limit) * 100).toFixed(1);
					console.log(`Progress: ${result.total}/${limit} (${percentage}%)`);
				}
			} catch (error) {
				result.errors.push(
					`Execution ${row.id}: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	} finally {
		await client.end();
	}

	return result;
}

/**
 * Analyze execution data from SQLite
 */
async function analyzeSqlite(
	config: ReturnType<typeof getDbConfig>,
	sampleSize: number | 'all',
): Promise<AnalysisResult> {
	if (config.type !== 'sqlite') throw new Error('Invalid config type');

	return new Promise((resolve, reject) => {
		const db = new sqlite3.Database(config.database, sqlite3.OPEN_READONLY, (err) => {
			if (err) {
				reject(new Error(`Failed to open database: ${err.message}`));
				return;
			}
			console.log('✓ Connected to SQLite database\n');
		});

		const result: AnalysisResult = {
			total: 0,
			hasCircularRefs: 0,
			canSerializeWithJSON: 0,
			errors: [],
			sampleExecutionIds: [],
		};

		const dbAll = promisify(db.all.bind(db));

		(async () => {
			try {
				// Get total count
				const countRes = await dbAll('SELECT COUNT(*) as count FROM execution_entity') as any[];
				const totalCount = countRes[0].count;

				console.log(`Found ${totalCount} executions in database`);

				// Determine how many to analyze
				const limit = sampleSize === 'all' ? totalCount : Math.min(sampleSize, totalCount);
				console.log(`Analyzing ${limit} executions...\n`);

				// Fetch execution data
				const query = sampleSize === 'all'
					? `SELECT e.id, ed.data
					   FROM execution_entity e
					   INNER JOIN execution_data ed ON e.id = ed.executionId
					   WHERE ed.data IS NOT NULL
					   ORDER BY e.id DESC`
					: `SELECT e.id, ed.data
					   FROM execution_entity e
					   INNER JOIN execution_data ed ON e.id = ed.executionId
					   WHERE ed.data IS NOT NULL
					   ORDER BY RANDOM()
					   LIMIT ${limit}`;

				const rows = await dbAll(query) as any[];

				for (const row of rows) {
					try {
						result.total++;

						// Parse the flatted data
						const parsedData = parse(row.data);

						// Check if it has circular references
						if (hasCircularReferences(parsedData)) {
							result.hasCircularRefs++;
							result.sampleExecutionIds.push(row.id);
						} else {
							result.canSerializeWithJSON++;
						}

						if (result.total % 100 === 0) {
							const percentage = ((result.total / limit) * 100).toFixed(1);
							console.log(`Progress: ${result.total}/${limit} (${percentage}%)`);
						}
					} catch (error) {
						result.errors.push(
							`Execution ${row.id}: ${error instanceof Error ? error.message : String(error)}`
						);
					}
				}

				db.close();
				resolve(result);
			} catch (error) {
				db.close();
				reject(error);
			}
		})();
	});
}

/**
 * Print analysis results
 */
function printResults(result: AnalysisResult): void {
	console.log('\n' + '='.repeat(80));
	console.log('CIRCULAR REFERENCE ANALYSIS RESULTS');
	console.log('='.repeat(80));

	console.log(`\nTotal executions analyzed: ${result.total}`);
	console.log(`Executions with circular references: ${result.hasCircularRefs}`);
	console.log(`Executions serializable with JSON.stringify: ${result.canSerializeWithJSON}`);

	if (result.total > 0) {
		const circularPercentage = ((result.hasCircularRefs / result.total) * 100).toFixed(2);
		const jsonPercentage = ((result.canSerializeWithJSON / result.total) * 100).toFixed(2);

		console.log(`\n📊 Percentage with circular refs: ${circularPercentage}%`);
		console.log(`📊 Percentage serializable with JSON: ${jsonPercentage}%`);
	}

	if (result.errors.length > 0) {
		console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
		console.log('First 5 errors:');
		result.errors.slice(0, 5).forEach((error) => {
			console.log(`  - ${error}`);
		});
	}

	if (result.sampleExecutionIds.length > 0) {
		console.log(`\n🔍 Sample execution IDs with circular refs (first 10):`);
		result.sampleExecutionIds.slice(0, 10).forEach((id) => {
			console.log(`  - ${id}`);
		});
	}

	console.log('\n' + '='.repeat(80));

	// Recommendation
	if (result.total > 0) {
		const circularPercentage = (result.hasCircularRefs / result.total) * 100;

		console.log('\n💡 RECOMMENDATION:\n');
		if (circularPercentage === 0) {
			console.log('✅ Safe to replace flatted with JSON.stringify/parse');
			console.log('   No circular references found in analyzed executions.');
		} else if (circularPercentage < 1) {
			console.log('⚠️  Consider replacing flatted with conditional handling');
			console.log(`   Only ${circularPercentage.toFixed(2)}% of executions have circular refs.`);
			console.log('   Could use JSON.stringify with try/catch fallback.');
		} else if (circularPercentage < 10) {
			console.log('⚠️  Investigate circular ref sources before replacing');
			console.log(`   ${circularPercentage.toFixed(2)}% of executions have circular refs.`);
			console.log('   May need to fix root causes in nodes.');
		} else {
			console.log('❌ Keep flatted or fix circular reference issues');
			console.log(`   ${circularPercentage.toFixed(2)}% of executions have circular refs.`);
			console.log('   Too many circular references to safely remove flatted.');
		}
	}

	console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main execution
 */
async function main() {
	const arg = process.argv[2];
	const sampleSize = arg === 'all' ? 'all' : parseInt(arg || '1000', 10);

	if (sampleSize !== 'all' && (isNaN(sampleSize) || sampleSize <= 0)) {
		console.error('Invalid sample size. Usage: tsx analyze-circular-refs-simple.ts [sample-size|all]');
		process.exit(1);
	}

	console.log('🔍 Circular Reference Analysis Tool\n');
	console.log('====================================\n');

	if (sampleSize === 'all') {
		console.log('⚠️  Analyzing ALL executions. This may take a while...\n');
	} else {
		console.log(`Analyzing a sample of ${sampleSize} executions\n`);
	}

	const dbConfig = getDbConfig();
	console.log(`Database type: ${dbConfig.type}`);

	if (dbConfig.type === 'sqlite') {
		console.log(`Database file: ${dbConfig.database}\n`);
	} else {
		console.log(`Database host: ${dbConfig.host}:${dbConfig.port}`);
		console.log(`Database name: ${dbConfig.database}\n`);
	}

	try {
		const result = dbConfig.type === 'postgres'
			? await analyzePostgres(dbConfig, sampleSize)
			: await analyzeSqlite(dbConfig, sampleSize);

		printResults(result);
	} catch (error) {
		console.error('\n❌ Error during analysis:', error);
		process.exit(1);
	}
}

main().catch(console.error);
