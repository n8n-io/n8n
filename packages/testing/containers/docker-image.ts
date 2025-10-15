/**
 * Get the Docker image to use for the n8n container
 */
export function getDockerImageFromEnv(defaultImage = 'n8nio/n8n:local') {
	const configuredImage = process.env.N8N_DOCKER_IMAGE;
	if (!configuredImage) {
		return defaultImage;
	}

	const hasImageOrg = configuredImage.includes('/');
	const hasImageTag = configuredImage.includes(':');

	// Full image reference with org and tag (e.g., "n8nio/n8n:beta")
	if (hasImageOrg && hasImageTag) {
		return configuredImage;
	}

	// Image with org but no tag (e.g., "n8nio/n8n")
	if (hasImageOrg) {
		return configuredImage;
	}

	// Image with tag provided (e.g., "n8n:beta")
	if (hasImageTag) {
		return `n8nio/${configuredImage}`;
	}

	// Only tag name (e.g., "beta", "1.0.0")
	return `n8nio/n8n:${configuredImage}`;
}
