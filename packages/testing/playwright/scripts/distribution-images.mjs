// @ts-check

const CAPABILITY_SERVICES = {
	'dynamic-credentials': ['keycloak'],
	email: ['mailpit'],
	'external-secrets': ['localstack'],
	kafka: ['kafka'],
	kent: ['kent'],
	observability: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	oidc: ['keycloak'],
	proxy: ['proxy'],
	'source-control': ['gitea'],
};

const SERVICE_IMAGES = {
	cadvisor: ['cadvisor'],
	cloudflared: ['cloudflared'],
	gitea: ['gitea'],
	kafka: ['kafka'],
	kent: [],
	keycloak: ['keycloak'],
	loadBalancer: ['caddy'],
	localstack: ['localstack'],
	mailpit: ['mailpit'],
	mysql: ['mysql'],
	ngrok: ['ngrok'],
	postgres: ['postgres'],
	postgresExporter: ['postgresExporter'],
	proxy: ['mockserver'],
	redis: ['redis'],
	sandbox: ['sandboxApi', 'sandboxRunner', 'sandboxSandbox'],
	taskRunner: ['taskRunner'],
	tracing: ['jaeger', 'n8nTracer'],
	vector: ['vector'],
	victoriaLogs: ['victoriaLogs'],
	victoriaMetrics: ['victoriaMetrics'],
};

const BASE_IMAGES = ['postgres', 'redis', 'caddy', 'n8n', 'taskRunner'];

export function getRequiredImages(capabilities, services) {
	const images = new Set(BASE_IMAGES);
	const addServiceImages = (service) => {
		const serviceImages = SERVICE_IMAGES[service];
		if (!serviceImages) throw new Error(`No Docker image mapping for service "${service}"`);
		for (const image of serviceImages) images.add(image);
	};
	for (const capability of capabilities) {
		const capabilityServices = CAPABILITY_SERVICES[capability];
		if (!capabilityServices) {
			throw new Error(`No Docker image mapping for capability "${capability}"`);
		}
		for (const service of capabilityServices) addServiceImages(service);
	}
	for (const service of services) addServiceImages(service);
	return [...images].sort();
}
