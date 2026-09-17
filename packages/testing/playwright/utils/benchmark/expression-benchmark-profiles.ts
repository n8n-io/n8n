import type { BenchmarkDimensions } from './types';

interface RuntimeBenchmarkProfile {
	isolationSuffix: string;
	env: Record<string, string>;
	dimensions: BenchmarkDimensions;
	engineDatabase?: 'shared' | 'split';
}

export const VM_EAGER_BENCHMARK_PROFILE: RuntimeBenchmarkProfile = {
	isolationSuffix: 'vm-eager',
	env: {
		N8N_EXPRESSION_ENGINE: 'vm',
		N8N_EXPRESSION_ENGINE_LAZY_ACQUIRE: 'false',
		N8N_EXPRESSION_ENGINE_COMPILE_CACHE: 'false',
	},
	dimensions: {
		execution_engine: 'v1',
		expression_engine: 'vm',
		expression_lazy_acquire: 0,
		expression_compile_cache: 0,
		expression_profile: 'vm-eager',
	},
};

export const VM_LAZY_CACHE_BENCHMARK_PROFILE: RuntimeBenchmarkProfile = {
	isolationSuffix: 'vm-lazy-cache',
	env: {
		N8N_EXPRESSION_ENGINE: 'vm',
		N8N_EXPRESSION_ENGINE_LAZY_ACQUIRE: 'true',
		N8N_EXPRESSION_ENGINE_COMPILE_CACHE: 'true',
	},
	dimensions: {
		execution_engine: 'v1',
		expression_engine: 'vm',
		expression_lazy_acquire: 1,
		expression_compile_cache: 1,
		expression_profile: 'vm-lazy-cache',
	},
};

export const ENGINE_V2_BENCHMARK_PROFILE: RuntimeBenchmarkProfile = {
	isolationSuffix: 'engine-v2',
	env: {
		...VM_EAGER_BENCHMARK_PROFILE.env,
	},
	engineDatabase: 'shared',
	dimensions: {
		execution_engine: 'v2',
		database_topology: 'shared-postgres',
		database_metrics_scope: 'combined',
		expression_engine: 'vm',
		expression_lazy_acquire: 0,
		expression_compile_cache: 0,
		expression_profile: 'vm-eager',
	},
};

export const ENGINE_V2_LAZY_CACHE_BENCHMARK_PROFILE: RuntimeBenchmarkProfile = {
	isolationSuffix: 'engine-v2-vm-lazy-cache',
	env: {
		...VM_LAZY_CACHE_BENCHMARK_PROFILE.env,
	},
	engineDatabase: 'shared',
	dimensions: {
		...VM_LAZY_CACHE_BENCHMARK_PROFILE.dimensions,
		execution_engine: 'v2',
		database_topology: 'shared-postgres',
		database_metrics_scope: 'combined',
	},
};

export const ENGINE_V2_SPLIT_DB_LAZY_CACHE_BENCHMARK_PROFILE: RuntimeBenchmarkProfile = {
	...ENGINE_V2_LAZY_CACHE_BENCHMARK_PROFILE,
	isolationSuffix: 'engine-v2-split-db-vm-lazy-cache',
	engineDatabase: 'split',
	dimensions: {
		...ENGINE_V2_LAZY_CACHE_BENCHMARK_PROFILE.dimensions,
		database_topology: 'split-postgres',
		database_metrics_scope: 'control-plane',
	},
};
