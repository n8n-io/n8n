#!/usr/bin/env zx
/**
 * Script that deletes all resources created by the benchmark environment.
 *
 * This scripts tries to delete resources created by Terraform. If Terraform
 * state file is not found, it will try to delete resources using Azure CLI.
 * The terraform state is not persisted, so we want to support both cases.
 */
// @ts-check
import { $, minimist } from 'zx';
import { TerraformClient } from './clients/terraform-client.mjs';

const RESOURCE_GROUP_NAME = 'n8n-benchmarking';

const args = minimist(process.argv.slice(3), {
	boolean: ['debug'],
});

const isVerbose = !!args.debug;

async function main() {
	const terraformClient = new TerraformClient({ isVerbose });

	if (terraformClient.hasTerraformState()) {
		await terraformClient.destroyEnvironment();
	} else {
		await destroyUsingAz();
	}
}

async function destroyUsingAz() {
	const resourcesResult =
		await $`az resource list --resource-group ${RESOURCE_GROUP_NAME} --query "[?tags.Id == 'N8nBenchmark'].{id:id, createdAt:tags.CreatedAt}" -o json`;

	const resources = JSON.parse(resourcesResult.stdout);

	const resourcesToDelete = resources.map((resource) => resource.id);

	if (resourcesToDelete.length === 0) {
		console.log('No resources found in the resource group.');

		return;
	}

	await deleteResources(resourcesToDelete);
}

async function deleteResources(resourceIds) {
	// We don't know the order in which resource should be deleted.
	// Here's a poor person's approach to try deletion until all complete
	const MAX_ITERATIONS = 100;
	let i = 0;
	const toDelete = [...resourceIds];

	console.log(`Deleting ${resourceIds.length} resources...`);
	while (toDelete.length > 0) {
		const resourceId = toDelete.shift();
		const deleted = await deleteById(resourceId);
		if (!deleted) {
			toDelete.push(resourceId);
		}

		if (i++ > MAX_ITERATIONS) {
			console.log(
				`Max iterations reached. Exiting. Could not delete ${toDelete.length} resources.`,
			);
			process.exit(1);
		}
	}
}

async function deleteById(id) {
	try {
		await $`az resource delete --ids ${id}`;
		return true;
	} catch (error) {
		return false;
	}
}

main().catch((error) => {
	console.error('An error occurred destroying cloud env:');
	console.error(error);

	process.exit(1);
});
