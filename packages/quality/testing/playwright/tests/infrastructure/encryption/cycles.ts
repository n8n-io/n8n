import type { RestClient } from './api';
import type { CycleContext } from './harness';
import { fail, ok, passLine, runPhase, step, summary } from './harness';
import { bootStack, finishCycle, readInstanceVersion, swapInstance } from './instances';
import type { SeededJourneys } from './journeys';
import {
	assertJourneys,
	assertKeyRowCount,
	assertLegacyFormat,
	assertPrefixed,
	getActiveKeyId,
	seedJourneys,
} from './journeys';

export interface CycleImages {
	/** The old release the upgrade cycle seeds on and downgrades to. */
	from: string;
	/** The build under test. */
	to: string;
}

const secret = (tag: string) => `enc-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/**
 * MODE=upgrade — P1 seed on the old release, P2 upgrade with the rotation
 * flag off (byte-compatible writes), P3 downgrade-read on the old release,
 * P4 write-on + rotate. One stack lives through all four phases; only the
 * n8n image is swapped (`stack.replaceN8N`), so the database, network, user
 * folder, and host port stay.
 */
export async function runUpgradeCycle(ctx: CycleContext, images: CycleImages): Promise<void> {
	const SECRET_A = secret('up-A');
	const SECRET_B = secret('up-B');
	const SECRET_C = secret('up-C');
	const SECRET_D = secret('up-D');

	let api: RestClient;
	let fromVersion = '?';
	let credA = '';
	let credB = '';
	let seeded: SeededJourneys;

	await runPhase(ctx, 'P1 seed', async () => {
		step(ctx, `seeding on the old release (${images.from})`);
		api = await bootStack(ctx, {
			image: images.from,
			rotationFlag: false,
			label: 'the old release',
		});
		fromVersion = await readInstanceVersion(ctx);
		step(ctx, `FROM version: ${fromVersion}`);
		await api.createOwner();
		step(ctx, 'creating credential A (the seed data)');
		credA = await api.createCredential('encryption-cycle cred A (seeded on FROM)', SECRET_A);
		ok(ctx, `credential A = ${credA}`);
		await api.assertDecrypts(credA, SECRET_A, 'baseline on FROM');
		seeded = await seedJourneys(ctx, api, credA, 'encryption-cycle cred A (seeded on FROM)');
		await assertJourneys(ctx, api, seeded, 'baseline on FROM');
	});

	await runPhase(ctx, 'P2 upgrade', async () => {
		api = await swapInstance(ctx, {
			image: images.to,
			rotationFlag: false,
			label: 'the build under test',
		});
		await api.login();
		await api.assertDecrypts(credA, SECRET_A, 'old data survives the upgrade');
		step(ctx, 'creating credential B on the upgraded instance');
		credB = await api.createCredential(
			'encryption-cycle cred B (written on TO, flag off)',
			SECRET_B,
		);
		ok(ctx, `credential B = ${credB}`);
		step(ctx, 'checking B is stored in the LEGACY format (flag off => byte-compatible writes)');
		await assertLegacyFormat(ctx, credB, 'flag-off write');
		await api.assertDecrypts(credB, SECRET_B, 'fresh write on TO');
		step(ctx, 'checking the key store got seeded (exactly 2 deployment_key rows)');
		await assertKeyRowCount(ctx, 2);
		await assertJourneys(ctx, api, seeded, 'after the upgrade');
	});

	await runPhase(ctx, 'P3 downgrade', async () => {
		api = await swapInstance(ctx, {
			image: images.from,
			rotationFlag: false,
			label: 'the old release (downgrade)',
		});
		await api.login();
		await api.assertDecrypts(
			credB,
			SECRET_B,
			'value written by the NEWER instance reads on the OLDER one',
		);
		await api.assertDecrypts(credA, SECRET_A, 'original data still fine on FROM');
		await assertJourneys(ctx, api, seeded, 'after the downgrade');
	});

	await runPhase(ctx, 'P4 write-on', async () => {
		api = await swapInstance(ctx, {
			image: images.to,
			rotationFlag: true,
			label: 'the build under test (flag on)',
		});
		await api.login();
		await api.assertDecrypts(credA, SECRET_A, 'mixed: seeded on FROM');
		await api.assertDecrypts(credB, SECRET_B, 'mixed: legacy written on TO');
		step(ctx, 'reading the active data-encryption key id');
		const activeKeyId = await getActiveKeyId(ctx);
		if (!activeKeyId) fail('no active aes-256-gcm deployment_key row');
		ok(ctx, `active key id: ${activeKeyId}`);
		step(ctx, 'creating credential C (must be keyId-prefixed)');
		const credC = await api.createCredential('encryption-cycle cred C (flag on)', SECRET_C);
		await assertPrefixed(ctx, credC, activeKeyId, 'flag-on write');
		await api.assertDecrypts(credC, SECRET_C, 'prefixed write');
		step(ctx, 'rotating the key via POST /rest/encryption/keys');
		const newKeyId = await api.rotateKey(activeKeyId);
		ok(ctx, `rotated: ${activeKeyId} -> ${newKeyId}`);
		step(ctx, 'creating credential D (must use the NEW key id)');
		const credD = await api.createCredential('encryption-cycle cred D (after rotate)', SECRET_D);
		await assertPrefixed(ctx, credD, newKeyId, 'write after rotation');
		step(ctx, 'final sweep: all four generations must decrypt');
		for (const [id, expected] of [
			[credA, SECRET_A],
			[credB, SECRET_B],
			[credC, SECRET_C],
			[credD, SECRET_D],
		] as const) {
			await api.assertDecrypts(id, expected, 'all generations');
		}
		await assertJourneys(ctx, api, seeded, 'write-on');
	});

	await finishCycle(ctx);
	summary(ctx);
	passLine(
		`PASS [${ctx.backend}]: seed(${fromVersion}) -> upgrade(read) -> downgrade-read -> write-on+rotate, all decrypts OK`,
	);
}

/**
 * MODE=rotation — the standalone test of DB-stored key rotation: the build
 * under test only, fresh database, flag ON. R1 seed, R2 rotate twice with a
 * write after each, R3 restart-read (a fresh process must reload the keys
 * from the database).
 */
export async function runRotationCycle(ctx: CycleContext, images: CycleImages): Promise<void> {
	const SECRET_A = secret('rot-A');
	const SECRET_B = secret('rot-B');
	const SECRET_C = secret('rot-C');
	const SECRET_D = secret('rot-D');

	let api: RestClient;
	let credA = '';
	let credB = '';
	let credC = '';
	let key1 = '';
	let key3 = '';
	let seeded: SeededJourneys;

	await runPhase(ctx, 'R1 seed', async () => {
		step(ctx, 'booting the build under test on a fresh database, rotation flag ON');
		api = await bootStack(ctx, {
			image: images.to,
			rotationFlag: true,
			label: 'the build under test',
		});
		await api.createOwner();
		step(ctx, 'checking the key store got seeded (exactly 2 deployment_key rows)');
		await assertKeyRowCount(ctx, 2);
		key1 = await getActiveKeyId(ctx);
		if (!key1) fail('no active aes-256-gcm deployment_key row');
		ok(ctx, `active key id: ${key1}`);
		step(ctx, 'creating credential A (must be keyId-prefixed)');
		credA = await api.createCredential('rotation-cycle cred A (initial key)', SECRET_A);
		await assertPrefixed(ctx, credA, key1, 'first write');
		await api.assertDecrypts(credA, SECRET_A, 'first write');
		seeded = await seedJourneys(ctx, api, credA, 'rotation-cycle cred A (initial key)');
		await assertJourneys(ctx, api, seeded, 'seed');
	});

	await runPhase(ctx, 'R2 rotate', async () => {
		step(ctx, 'first rotation via POST /rest/encryption/keys');
		const key2 = await api.rotateKey(key1);
		ok(ctx, `rotated: ${key1} -> ${key2}`);
		step(ctx, 'creating credential B (must use the NEW key id)');
		credB = await api.createCredential('rotation-cycle cred B (after 1st rotate)', SECRET_B);
		await assertPrefixed(ctx, credB, key2, 'write after the 1st rotation');
		await api.assertDecrypts(credB, SECRET_B, 'write after the 1st rotation');
		step(ctx, 'second rotation via POST /rest/encryption/keys');
		key3 = await api.rotateKey(key2);
		ok(ctx, `rotated: ${key2} -> ${key3}`);
		step(ctx, 'creating credential C (must use the NEWEST key id)');
		credC = await api.createCredential('rotation-cycle cred C (after 2nd rotate)', SECRET_C);
		await assertPrefixed(ctx, credC, key3, 'write after the 2nd rotation');
		await api.assertDecrypts(credC, SECRET_C, 'write after the 2nd rotation');
		step(ctx, 'checking the key store keeps every generation (4 rows, exactly 1 active)');
		await assertKeyRowCount(ctx, 4);
		const activeRows = await getActiveKeyId(ctx);
		if (!activeRows || activeRows.includes('\n')) {
			fail('expected exactly 1 active key', `active rows:\n${activeRows}`);
		}
		ok(ctx, '4 key rows kept, exactly 1 active');
	});

	await runPhase(ctx, 'R3 restart', async () => {
		step(ctx, 'restarting the instance (keys must reload from the database)');
		api = await swapInstance(ctx, {
			image: images.to,
			rotationFlag: true,
			label: 'the build under test (restarted)',
		});
		await api.login();
		step(
			ctx,
			'creating credential D (the restarted instance must keep writing with the active key)',
		);
		const credD = await api.createCredential('rotation-cycle cred D (after restart)', SECRET_D);
		await assertPrefixed(ctx, credD, key3, 'write after the restart');
		step(ctx, 'final sweep: every generation must decrypt after the restart');
		for (const [id, expected] of [
			[credA, SECRET_A],
			[credB, SECRET_B],
			[credC, SECRET_C],
			[credD, SECRET_D],
		] as const) {
			await api.assertDecrypts(id, expected, 'all generations');
		}
		await assertJourneys(ctx, api, seeded, 'after the restart');
	});

	await finishCycle(ctx);
	summary(ctx);
	passLine(`PASS [${ctx.backend}]: seed(flag on) -> rotate x2 -> restart-read, all decrypts OK`);
}
