import { rm } from 'node:fs/promises';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';

export interface CleanupFailure {
	resource: string;
	error: Error;
}

export interface CleanupReport {
	failures: CleanupFailure[];
	remaining: string[];
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Owns resources from one stack attempt, including resources acquired late. */
export class ResourceTracker {
	private readonly containers = new Map<string, StartedTestContainer>();

	private readonly paths = new Set<string>();

	private network: StartedNetwork | undefined;

	private activeAcquisitions = 0;

	private disposalComplete: Promise<void> | undefined;

	private resolveDisposalWait: (() => void) | undefined;

	private disposalPromise: Promise<CleanupReport> | undefined;

	trackNetwork(network: StartedNetwork): void {
		this.network = network;
	}

	trackContainer(container: StartedTestContainer): void {
		this.containers.set(container.getId(), container);
	}

	trackPath(path: string): void {
		this.paths.add(path);
	}

	beginAcquisition(): () => void {
		this.activeAcquisitions++;
		let ended = false;
		return () => {
			if (ended) return;
			ended = true;
			this.activeAcquisitions--;
			if (this.activeAcquisitions === 0) this.resolveDisposalWait?.();
		};
	}

	async dispose(options?: { timeout?: number }): Promise<CleanupReport> {
		this.disposalPromise ??= this.disposeResources(options);
		return await this.disposalPromise;
	}

	private async disposeResources(options?: { timeout?: number }): Promise<CleanupReport> {
		if (this.activeAcquisitions > 0) {
			this.disposalComplete ??= new Promise<void>((resolve) => {
				this.resolveDisposalWait = resolve;
			});
			await this.disposalComplete;
		}

		const failures: CleanupFailure[] = [];
		for (const container of [...this.containers.values()].reverse()) {
			try {
				await container.stop(options);
				this.containers.delete(container.getId());
			} catch (error) {
				failures.push({
					resource: `container ${container.getId()}`,
					error: new Error(errorMessage(error)),
				});
			}
		}

		if (this.network) {
			const network = this.network;
			try {
				await network.stop();
				this.network = undefined;
			} catch (error) {
				failures.push({
					resource: `network ${network.getName()}`,
					error: new Error(errorMessage(error)),
				});
			}
		}

		for (const path of this.paths) {
			try {
				await rm(path, { recursive: true, force: true });
				this.paths.delete(path);
			} catch (error) {
				failures.push({ resource: `path ${path}`, error: new Error(errorMessage(error)) });
			}
		}

		return { failures, remaining: this.remainingResources() };
	}

	private remainingResources(): string[] {
		return [
			...Array.from(this.containers.keys(), (id) => `container ${id}`),
			...(this.network ? [`network ${this.network.getName()}`] : []),
			...Array.from(this.paths, (path) => `path ${path}`),
		];
	}
}
