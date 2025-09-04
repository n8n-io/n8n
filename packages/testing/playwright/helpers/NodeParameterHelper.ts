import type { NodeDetailsViewPage } from '../pages/NodeDetailsViewPage';

/**
 * Helper class for setting node parameters in the NDV
 */
export class NodeParameterHelper {
	constructor(private ndv: NodeDetailsViewPage) {}

	/**
	 * Detects parameter type by checking DOM structure
	 * Supports dropdown, text, and switch parameters
	 * @param parameterName - The parameter name to check
	 * @returns The detected parameter type
	 */
	async detectParameterType(parameterName: string): Promise<'dropdown' | 'text' | 'switch'> {
		const parameterContainer = this.ndv.getParameterInput(parameterName);
		const [hasSwitch, hasSelect, hasSelectCaret] = await Promise.all([
			parameterContainer
				.locator('.el-switch')
				.count()
				.then((count) => count > 0),
			parameterContainer
				.locator('.el-select')
				.count()
				.then((count) => count > 0),
			parameterContainer
				.locator('.el-select__caret')
				.count()
				.then((count) => count > 0),
		]);

		if (hasSwitch) return 'switch';
		if (hasSelect && hasSelectCaret) return 'dropdown';
		return 'text';
	}

	/**
	 * Sets a parameter value with automatic type detection or explicit type
	 * Supports dropdown, text, and switch parameters
	 * @param parameterName - Name of the parameter to set
	 * @param value - Value to set (string or boolean)
	 * @param type - Optional explicit type to skip detection for better performance
	 */
	async setParameter(
		parameterName: string,
		value: string | boolean,
		type?: 'dropdown' | 'text' | 'switch',
	): Promise<void> {
		if (typeof value === 'boolean') {
			await this.ndv.setParameterSwitch(parameterName, value);
			return;
		}

		const parameterType = type ?? (await this.detectParameterType(parameterName));
		switch (parameterType) {
			case 'dropdown':
				await this.ndv.setParameterDropdown(parameterName, value);
				break;
			case 'text':
				await this.ndv.setParameterInput(parameterName, value);
				break;
			case 'switch':
				await this.ndv.setParameterSwitch(parameterName, value === 'true');
				break;
		}
	}

	async webhook(config: {
		httpMethod?: string;
		path?: string;
		authentication?: string;
		responseMode?: string;
	}): Promise<void> {
		if (config.httpMethod !== undefined)
			await this.setParameter('httpMethod', config.httpMethod, 'dropdown');
		if (config.path !== undefined) await this.setParameter('path', config.path, 'text');
		if (config.authentication !== undefined)
			await this.setParameter('authentication', config.authentication, 'dropdown');
		if (config.responseMode !== undefined)
			await this.setParameter('responseMode', config.responseMode, 'dropdown');
	}

	/**
	 * Simplified HTTP Request node parameter configuration
	 * @param config - Configuration object with parameter values
	 */
	async httpRequest(config: {
		method?: string;
		url?: string;
		authentication?: string;
		sendQuery?: boolean;
		sendHeaders?: boolean;
		sendBody?: boolean;
	}): Promise<void> {
		if (config.method !== undefined) await this.setParameter('method', config.method, 'dropdown');
		if (config.url !== undefined) await this.setParameter('url', config.url, 'text');
		if (config.authentication !== undefined)
			await this.setParameter('authentication', config.authentication, 'dropdown');
		if (config.sendQuery !== undefined)
			await this.setParameter('sendQuery', config.sendQuery, 'switch');
		if (config.sendHeaders !== undefined)
			await this.setParameter('sendHeaders', config.sendHeaders, 'switch');
		if (config.sendBody !== undefined)
			await this.setParameter('sendBody', config.sendBody, 'switch');
	}
}
