import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

function xdg(variable: string, fallback: string): string {
	const value = process.env[variable];
	return value && value.length > 0 ? value : join(homedir(), fallback);
}

export function configDir(): string {
	return process.env.RIG_CONFIG_DIR ?? join(xdg('XDG_CONFIG_HOME', '.config'), 'rig');
}

export function dataDir(): string {
	return process.env.RIG_DATA_DIR ?? join(xdg('XDG_DATA_HOME', '.local/share'), 'rig');
}

export function cacheDir(): string {
	return process.env.RIG_CACHE_DIR ?? join(xdg('XDG_CACHE_HOME', '.cache'), 'rig');
}

export function globalConfigFile(): string {
	return join(configDir(), 'config.yaml');
}

export function envsDir(): string {
	return join(dataDir(), 'envs');
}

export function currentEnvFile(): string {
	return join(dataDir(), 'current');
}

export function expandHome(path: string): string {
	if (path === '~') return homedir();
	if (path.startsWith('~/')) return join(homedir(), path.slice(2));
	return resolve(path);
}

/** All paths inside one environment directory. */
export class EnvPaths {
	constructor(readonly root: string) {}

	get envYaml() {
		return join(this.root, 'env.yaml');
	}

	get layersDir() {
		return join(this.root, 'env');
	}

	layerFile(layer: string) {
		return join(this.layersDir, `${layer}.env`);
	}

	get secrets() {
		return join(this.root, 'secrets.env');
	}

	get compose() {
		return join(this.root, 'compose.yaml');
	}

	get postgresInit() {
		return join(this.root, 'postgres-init.sql');
	}

	launcherConfig(host: string) {
		return join(this.root, 'launcher', `${host}.json`);
	}

	get dataRoot() {
		return join(this.root, 'data');
	}

	userFolder(component: string) {
		return join(this.dataRoot, component);
	}

	get storage() {
		return join(this.dataRoot, 'storage');
	}

	get logsDir() {
		return join(this.root, 'logs');
	}

	log(component: string) {
		return join(this.logsDir, `${component}.log`);
	}

	previousLog(component: string) {
		return join(this.logsDir, `${component}.1.log`);
	}

	get stateDir() {
		return join(this.root, 'state');
	}

	/** The public URL of the tunnel, written when the tunnel connects. */
	get tunnelState() {
		return join(this.stateDir, 'tunnel.json');
	}

	state(component: string) {
		return join(this.stateDir, `${component}.json`);
	}
}
