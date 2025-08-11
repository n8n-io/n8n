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
	trial: { memory: 0.375, cpu: 0.2 }, // 384MB RAM, 200 millicore CPU
	starter: { memory: 0.375, cpu: 0.2 }, // 384MB RAM, 200 millicore CPU
	pro1: { memory: 0.625, cpu: 0.5 }, // 640MB RAM, 500 millicore CPU
	pro2: { memory: 1.25, cpu: 0.75 }, // 1.28GB RAM, 750 millicore CPU
	enterprise: { memory: 4.0, cpu: 1.0 }, // 4GB RAM, 1.0 CPU core
} as const;

export type PerformancePlanName = keyof typeof BASE_PERFORMANCE_PLANS;

export function isValidPerformancePlan(name: string): name is PerformancePlanName {
	return name in BASE_PERFORMANCE_PLANS;
}
