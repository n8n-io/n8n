export class MemoryMonitor {
	static getMemoryUsage() {
		const usage = process.memoryUsage();
		return {
			heapUsedMb: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100, // MB
			heapTotalMb: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100, // MB
			externalMb: Math.round((usage.external / 1024 / 1024) * 100) / 100, // MB
			rssMb: Math.round((usage.rss / 1024 / 1024) * 100) / 100, // MB
			arrayBuffersMb: Math.round((usage.arrayBuffers / 1024 / 1024) * 100) / 100, // MB
			heapUsedPercentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
		};
	}
}
