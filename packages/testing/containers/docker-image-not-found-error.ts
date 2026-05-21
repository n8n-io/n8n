import { TEST_CONTAINER_IMAGES } from './test-containers';

// Custom error class for when the Docker image is not found locally/remotely
// This can happen when using the "n8nio/n8n:local" image, which is not available on Docker Hub
// This image is available after running `pnpm build:docker` at the root of the repository
export class DockerImageNotFoundError extends Error {
	constructor(containerName: string, originalError?: Error) {
		const dockerImage = TEST_CONTAINER_IMAGES.n8n;

		const message = `Failed to start container ${containerName}: Docker image '${dockerImage}' not found locally!

This is likely because the image is not available locally.
To fix this, you can either:
  1. Build the image by running: pnpm build:docker at the root
  2. Use a different image by setting: TEST_IMAGE_N8N=<image-tag>

Example with different image:
  TEST_IMAGE_N8N=n8nio/n8n:latest npm run stack`;

		super(message);
		this.name = 'DockerImageNotFoundError';
		this.cause = originalError;
	}
}
