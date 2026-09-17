import type { BenchmarkDimensions } from './types';

interface ExpressionBenchmarkProfile {
	isolationSuffix: string;
	env: Record<string, string>;
	dimensions: BenchmarkDimensions;
}

export const VM_EAGER_BENCHMARK_PROFILE: ExpressionBenchmarkProfile = {
	isolationSuffix: 'vm-eager',
	env: {
		N8N_EXPRESSION_ENGINE: 'vm',
		N8N_EXPRESSION_ENGINE_LAZY_ACQUIRE: 'false',
		N8N_EXPRESSION_ENGINE_COMPILE_CACHE: 'false',
	},
	dimensions: {
		expression_engine: 'vm',
		expression_lazy_acquire: 0,
		expression_compile_cache: 0,
		expression_profile: 'vm-eager',
	},
};

export const VM_LAZY_CACHE_BENCHMARK_PROFILE: ExpressionBenchmarkProfile = {
	isolationSuffix: 'vm-lazy-cache',
	env: {
		N8N_EXPRESSION_ENGINE: 'vm',
		N8N_EXPRESSION_ENGINE_LAZY_ACQUIRE: 'true',
		N8N_EXPRESSION_ENGINE_COMPILE_CACHE: 'true',
	},
	dimensions: {
		expression_engine: 'vm',
		expression_lazy_acquire: 1,
		expression_compile_cache: 1,
		expression_profile: 'vm-lazy-cache',
	},
};
