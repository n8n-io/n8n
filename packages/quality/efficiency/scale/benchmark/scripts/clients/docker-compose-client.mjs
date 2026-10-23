import { which } from 'zx';

export class DockerComposeClient {
	/**
	 *
	 * @param {{ $: Shell; verbose?: boolean }} opts
	 */
	constructor({ $ }) {
		this.$$ = $;
	}

	async $(...args) {
		await this.resolveExecutableIfNeeded();

		if (this.isCompose) {
			return await this.$$`docker-compose ${args}`;
		} else {
			return await this.$$`docker compose ${args}`;
		}
	}

	async resolveExecutableIfNeeded() {
		if (this.isResolved) {
			return;
		}

		// The VM deployment doesn't have `docker compose` available,
		// so try to resolve the `docker-compose` first
		const compose = await which('docker-compose', { nothrow: true });
		if (compose) {
			this.isResolved = true;
			this.isCompose = true;
			return;
		}

		const docker = await which('docker', { nothrow: true });
		if (docker) {
			this.isResolved = true;
			this.isCompose = false;
			return;
		}

		throw new Error('Could not resolve docker-compose or docker');
	}
}
