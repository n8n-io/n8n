export class MemoryMonitor {
	static getMemoryUsage() {
		const usage = process.memoryUsage();
		return {
			heapUsed: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100, // MB
			heapTotal: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100, // MB
			external: Math.round((usage.external / 1024 / 1024) * 100) / 100, // MB
			rss: Math.round((usage.rss / 1024 / 1024) * 100) / 100, // MB
			arrayBuffers: Math.round((usage.arrayBuffers / 1024 / 1024) * 100) / 100, // MB
			heapUsedPercentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
		};
	}
}
