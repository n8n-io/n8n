#!/usr/bin/env node
/**
 * Quick script to check a specific execution for circular references
 * and show where they occur in the data structure.
 *
 * Usage:
 *   pnpm tsx scripts/check-execution-circular-ref.ts <execution-id>
 */

import { parse } from 'flatted';
import pg from 'pg';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

/**
 * Find circular references in an object and return their paths
 */
function findCircularRefs(
	obj: any,
	seen = new WeakSet(),
	path = 'root',
	results: string[] = []
): string[] {
	if (obj === null || typeof obj !== 'object') {
		return results;
	}

	if (seen.has(obj)) {
		results.push(path);
		return results;
	}

	seen.add(obj);

	if (Array.isArray(obj)) {
		obj.forEach((item, index) => {
			findCircularRefs(item, seen, `${path}[${index}]`, results);
		});
	} else {
		Object.keys(obj).forEach((key) => {
			findCircularRefs(obj[key], seen, `${path}.${key}`, results);
		});
	}

	return results;
}

/**
 * Get value at path
 */
function getValueAtPath(obj: any, path: string): any {
	if (path === 'root') return obj;

	const parts = path.replace('root.', '').split(/\.|\[/).map(p => p.replace(/\]/, ''));
	let current = obj;

	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		current = current[part];
	}

	return current;
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
async function fetchExecutionPostgres(
	config: ReturnType<typeof getDbConfig>,
	executionId: string
): Promise<string | null> {
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
			`SELECT ed.data
			 FROM ${config.schema}.execution_data ed
			 WHERE ed."executionId" = $1`,
			[executionId]
		);

		if (res.rows.length === 0) return null;
		return res.rows[0].data;
	} finally {
		await client.end();
	}
}

/**
 * Fetch execution data from SQLite
 */
async function fetchExecutionSqlite(
	config: ReturnType<typeof getDbConfig>,
	executionId: string
): Promise<string | null> {
	if (config.type !== 'sqlite') throw new Error('Invalid config type');

	return new Promise((resolve, reject) => {
		const db = new sqlite3.Database(config.database, sqlite3.OPEN_READONLY, (err) => {
			if (err) {
				reject(new Error(`Failed to open database: ${err.message}`));
				return;
			}
		});

		db.get(
			'SELECT data FROM execution_data WHERE executionId = ?',
			[executionId],
			(err, row: any) => {
				db.close();
				if (err) {
					reject(err);
				} else if (!row) {
					resolve(null);
				} else {
					resolve(row.data);
				}
			}
		);
	});
}

/**
 * Main execution
 */
async function main() {
	const executionId = process.argv[2];

	if (!executionId) {
		console.error('Usage: pnpm tsx scripts/check-execution-circular-ref.ts <execution-id>');
		process.exit(1);
	}

	console.log(`🔍 Checking execution ${executionId} for circular references...\n`);

	const dbConfig = getDbConfig();

	try {
		console.log(`Connecting to ${dbConfig.type} database...`);

		const data = dbConfig.type === 'postgres'
			? await fetchExecutionPostgres(dbConfig, executionId)
			: await fetchExecutionSqlite(dbConfig, executionId);

		if (!data) {
			console.error(`❌ Execution ${executionId} not found in database`);
			process.exit(1);
		}

		console.log('✓ Execution data fetched\n');

		// Parse with flatted
		console.log('Parsing execution data...');
		const parsedData = parse(data);

		// Check if it can be serialized with JSON.stringify
		console.log('Testing JSON.stringify...');
		let hasCircular = false;
		try {
			JSON.stringify(parsedData);
			console.log('✅ No circular references detected!\n');
		} catch (error) {
			if (error instanceof Error && error.message.includes('circular')) {
				hasCircular = true;
				console.log('⚠️  Circular reference detected!\n');
			} else {
				throw error;
			}
		}

		if (hasCircular) {
			console.log('Finding circular reference locations...\n');
			const circularPaths = findCircularRefs(parsedData);

			console.log(`Found ${circularPaths.length} circular reference(s):\n`);

			circularPaths.forEach((path, index) => {
				console.log(`${index + 1}. ${path}`);

				// Try to show the type of object at that path
				const value = getValueAtPath(parsedData, path);
				if (value && typeof value === 'object') {
					const keys = Object.keys(value).slice(0, 5);
					console.log(`   Type: ${Array.isArray(value) ? 'Array' : 'Object'}`);
					if (!Array.isArray(value)) {
						console.log(`   Keys (first 5): ${keys.join(', ')}`);
					}
				}
				console.log();
			});

			// Try to find common patterns
			console.log('Common patterns:');
			const pathStrings = circularPaths.map(p => p.toLowerCase());

			if (pathStrings.some(p => p.includes('response') && p.includes('request'))) {
				console.log('  - HTTP response.request circular reference (known issue)');
			}
			if (pathStrings.some(p => p.includes('error') || p.includes('stack'))) {
				console.log('  - Error object circular reference');
			}
			if (pathStrings.some(p => p.includes('parent') || p.includes('child'))) {
				console.log('  - Parent-child relationship circular reference');
			}

			console.log('\n💡 Recommendation:');
			console.log('   Investigate these nodes and consider using removeCircularRefs()');
			console.log('   or fix the root cause in the node implementation.');
		}

		console.log('\nData size:');
		console.log(`  Stringified (flatted): ${data.length.toLocaleString()} bytes`);
		if (!hasCircular) {
			const jsonSize = JSON.stringify(parsedData).length;
			console.log(`  Stringified (JSON):    ${jsonSize.toLocaleString()} bytes`);
			const diff = data.length - jsonSize;
			const diffPercent = ((diff / data.length) * 100).toFixed(2);
			if (diff > 0) {
				console.log(`  Difference:            ${diff.toLocaleString()} bytes (${diffPercent}% smaller with JSON)`);
			}
		}

	} catch (error) {
		console.error('\n❌ Error:', error);
		process.exit(1);
	}
}

main().catch(console.error);
