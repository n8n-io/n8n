/**
 * Get the Docker image to use for the n8n container
 */
export function getDockerImageFromEnv(defaultImage = 'n8nio/n8n:local') {
	const configuredImage = process.env.N8N_DOCKER_IMAGE;
	if (!configuredImage) {
		return defaultImage;
	}

	const imageWithTag = configuredImage.includes(':') ? configuredImage : `n8n:${configuredImage}`;

	return imageWithTag.includes('/') ? imageWithTag : `n8nio/${imageWithTag}`;
}
