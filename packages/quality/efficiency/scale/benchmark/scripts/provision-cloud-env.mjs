#!/usr/bin/env zx
/**
 * Provisions the cloud benchmark environment
 *
 * NOTE: Must be run in the root of the package.
 */
// @ts-check
import { which, minimist } from 'zx';
import { TerraformClient } from './clients/terraform-client.mjs';

const args = minimist(process.argv.slice(3), {
	boolean: ['debug'],
});

const isVerbose = !!args.debug;

export async function provision() {
	await ensureDependencies();

	const terraformClient = new TerraformClient({
		isVerbose,
	});

	await terraformClient.provisionEnvironment();
}

async function ensureDependencies() {
	await which('terraform');
}

provision().catch((error) => {
	console.error('An error occurred while provisioning cloud env:');
	console.error(error);

	process.exit(1);
});
