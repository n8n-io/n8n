import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
// import urlJoin from 'url-join';

const urlJoin = (...parts: string[]): string => {
	return parts.filter((part) => part).join('/');
};

export class BaseAPIClient {
	protected client: AxiosInstance;
	protected baseUrl: string;

	constructor(apiKey: string, baseUrl: string = 'https://app.watercrawl.dev') {
		this.baseUrl = baseUrl;
		this.client = axios.create({
			baseURL: this.baseUrl,
			headers: {
				'X-API-KEY': `${apiKey}`,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		});

		// Add response interceptor for error handling
		this.client.interceptors.response.use(
			(response) => response,
			(error) => {
				if (error.response) {
					// Log API errors
					console.error('API Error:', {
						url: error.config.url,
						status: error.response.status,
						data: error.response.data,
						headers: error.response.headers,
					});
				}
				throw error;
			},
		);
	}

	protected async get<T>(path: string, params: Record<string, any> = {}): Promise<T> {
		const response = await this.client.get<T>(path, { params });
		return response.data;
	}

	protected async post<T>(path: string, data: Record<string, any> = {}): Promise<T> {
		const response = await this.client.post<T>(path, data);
		return response.data;
	}

	protected async put<T>(path: string, data: Record<string, any> = {}): Promise<T> {
		const response = await this.client.put<T>(path, data);
		return response.data;
	}

	protected async delete<T>(path: string): Promise<T> {
		const response = await this.client.delete<T>(path);
		return response.data;
	}

	protected async patch<T>(path: string, data: Record<string, any> = {}): Promise<T> {
		const response = await this.client.patch<T>(path, data);
		return response.data;
	}

	protected buildUrl(...parts: string[]): string {
		return urlJoin(this.baseUrl, ...parts);
	}

	protected async streamEvents(
		endpoint: string,
		onEvent: (event: any) => void,
		config: AxiosRequestConfig = {},
	): Promise<void> {
		const response = await this.client.get(endpoint, {
			responseType: 'stream',
			...config,
		});
		let buffer = '';

		const stream = response.data;

		return new Promise<void>((resolve, reject) => {
			stream.on('data', (chunk: string) => {
				buffer += chunk.toString();
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6));
							onEvent(data);
						} catch (error) {
							console.error('Error parsing event data:', line, error);
						}
					}
				}
			});

			stream.on('end', () => {
				// Process any remaining data in the buffer
				if (buffer && buffer.startsWith('data: ')) {
					try {
						const data = JSON.parse(buffer.slice(6));
						onEvent(data);
					} catch (error) {
						console.error('Error parsing event data:', buffer, error);
					}
				}
				resolve();
			});

			stream.on('error', (err: Error) => {
				reject(err);
			});
		});
	}
}
