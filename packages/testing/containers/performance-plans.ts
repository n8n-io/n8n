/**
 * Shared Performance Plan Types and Configurations
 *
 * This file provides the base performance plan definitions that can be used by:
 * - CLI tools (n8n-start-stack.ts)
 * - Playwright tests (cloud-only.ts)
 *
 */

// Base performance plan configuration (resource constraints only)
export interface BasePerformancePlan {
	memory: number; // in GB
	cpu: number; // in cores
}

export const BASE_PERFORMANCE_PLANS: Record<string, BasePerformancePlan> = {
	trial: { memory: 0.75, cpu: 1 }, // 768MB RAM, 1000 millicore CPU
	starter: { memory: 0.75, cpu: 1 }, // 768MB RAM, 1000 millicore CPU
	pro1: { memory: 1.25, cpu: 1 }, // 1.25GB RAM, 1000 millicore CPU
	pro2: { memory: 2.5, cpu: 1.5 }, // 2.5GB RAM, 1500 millicore CPU
	enterprise: { memory: 8.0, cpu: 2.0 }, // 8GB RAM, 2.0 CPU core
} as const;

export type PerformancePlanName = keyof typeof BASE_PERFORMANCE_PLANS;

export function isValidPerformancePlan(name: string): name is PerformancePlanName {
	return name in BASE_PERFORMANCE_PLANS;
}
