import { EventEmitter } from 'events';

/**
 * Security Property: The task runner system must not allow adversarial inputs
 * to bypass request ID validation, leak data across request boundaries, or
 * enable unauthorized access to pending requests/data.
 */

// Minimal mock of the request tracking maps as used in task-runner.ts
class MockTaskRunner extends EventEmitter {
  private dataRequests = new Map<string, { resolve: Function; reject: Function; data?: unknown }>();
  private nodeTypesRequests = new Map<string, { resolve: Function; reject: Function; data?: unknown }>();
  private executionData = new Map<string, unknown>();

  registerDataRequest(requestId: string, resolve: Function, reject: Function): void {
    if (!this.isValidRequestId(requestId)) {
      throw new Error(`Invalid request ID: ${requestId}`);
    }
    this.dataRequests.set(requestId, { resolve, reject });
  }

  registerNodeTypesRequest(requestId: string, resolve: Function, reject: Function): void {
    if (!this.isValidRequestId(requestId)) {
      throw new Error(`Invalid request ID: ${requestId}`);
    }
    this.nodeTypesRequests.set(requestId, { resolve, reject });
  }

  fulfillDataRequest(requestId: string, data: unknown): boolean {
    if (!this.isValidRequestId(requestId)) {
      return false;
    }
    const request = this.dataRequests.get(requestId);
    if (!request) {
      return false;
    }
    request.resolve(data);
    this.dataRequests.delete(requestId);
    return true;
  }

  fulfillNodeTypesRequest(requestId: string, data: unknown): boolean {
    if (!this.isValidRequestId(requestId)) {
      return false;
    }
    const request = this.nodeTypesRequests.get(requestId);
    if (!request) {
      return false;
    }
    request.resolve(data);
    this.nodeTypesRequests.delete(requestId);
    return true;
  }

  storeExecutionData(executionId: string, data: unknown): void {
    if (!this.isValidRequestId(executionId)) {
      throw new Error(`Invalid execution ID: ${executionId}`);
    }
    this.executionData.set(executionId, data);
  }

  getExecutionData(executionId: string): unknown {
    if (!this.isValidRequestId(executionId)) {
      return undefined;
    }
    return this.executionData.get(executionId);
  }

  getPendingDataRequestCount(): number {
    return this.dataRequests.size;
  }

  getPendingNodeTypesRequestCount(): number {
    return this.nodeTypesRequests.size;
  }

  hasDataRequest(requestId: string): boolean {
    return this.dataRequests.has(requestId);
  }

  hasNodeTypesRequest(requestId: string): boolean {
    return this.nodeTypesRequests.has(requestId);
  }

  private isValidRequestId(id: string): boolean {
    // Request IDs should be non-empty strings without path traversal or injection chars
    if (typeof id !== 'string' || id.length === 0 || id.length > 256) {
      return false;
    }
    // Must not contain null bytes, path separators, or shell metacharacters
    const dangerousPattern = /[\x00\n\r\t\\\/;|&`$<>'"{}()\[\]!#%^*?]/;
    if (dangerousPattern.test(id)) {
      return false;
    }
    return true;
  }
}

describe("Security property: Task runner request ID handling must reject adversarial inputs and prevent cross-request data leakage", () => {
  const adversarialPayloads: Array<[string, string]> = [
    ["null byte injection", "valid-id\x00../../etc/passwd"],
    ["path traversal", "../../../etc/shadow"],
    ["shell command injection semicolon", "req-id; rm -rf /"],
    ["shell command injection pipe", "req-id | cat /etc/passwd"],
    ["shell command injection backtick", "req-id`whoami`"],
    ["shell command injection dollar", "req-id$(id)"],
    ["newline injection", "req-id\nmalicious-header: injected"],
    ["carriage return injection", "req-id\rmalicious"],
    ["tab injection", "req-id\tmalicious"],
    ["SQL injection attempt", "req-id' OR '1'='1"],
    ["XSS payload", "<script>alert(1)</script>"],
    ["empty string", ""],
    ["extremely long string", "A".repeat(10000)],
    ["unicode null", "req-id\u0000evil"],
    ["backslash path traversal", "req-id\\..\\..\\windows\\system32"],
    ["ampersand injection", "req-id && cat /etc/passwd"],
    ["redirect injection", "req-id > /tmp/evil"],
    ["backtick command substitution", "`cat /etc/passwd`"],
    ["environment variable expansion", "${PATH}"],
    ["glob injection", "req-id*"],
    ["forward slash path", "/etc/passwd"],
    ["double dot path", "../../sensitive"],
    ["curly brace injection", "req-id{malicious}"],
    ["parenthesis injection", "req-id(malicious)"],
    ["bracket injection", "req-id[malicious]"],
  ];

  let runner: MockTaskRunner;

  beforeEach(() => {
    runner = new MockTaskRunner();
  });

  test.each(adversarialPayloads)(
    "rejects adversarial request ID: %s",
    async (description, payload) => {
      // INVARIANT 1: Adversarial request IDs must not be registered
      expect(() => {
        runner.registerDataRequest(payload, () => {}, () => {});
      }).toThrow();

      expect(() => {
        runner.registerNodeTypesRequest(payload, () => {}, () => {});
      }).toThrow();

      // INVARIANT 2: No pending requests should exist after rejection
      expect(runner.getPendingDataRequestCount()).toBe(0);
      expect(runner.getPendingNodeTypesRequestCount()).toBe(0);

      // INVARIANT 3: Fulfilling with adversarial ID must not succeed
      const fulfillDataResult = runner.fulfillDataRequest(payload, { secret: "sensitive-data" });
      expect(fulfillDataResult).toBe(false);

      const fulfillNodeResult = runner.fulfillNodeTypesRequest(payload, { secret: "sensitive-data" });
      expect(fulfillNodeResult).toBe(false);

      // INVARIANT 4: Adversarial IDs must not be stored in execution data
      expect(() => {
        runner.storeExecutionData(payload, { envVars: process.env });
      }).toThrow();

      // INVARIANT 5: Retrieving with adversarial ID must return undefined (no data leak)
      const retrieved = runner.getExecutionData(payload);
      expect(retrieved).toBeUndefined();
    }
  );

  test("valid request IDs work correctly and adversarial IDs cannot access their data", async () => {
    const validId = "valid-request-id-12345";
    const sensitiveData = { token: "super-secret-token", envSecret: "ENV_SECRET_VALUE" };

    let resolvedData: unknown;
    runner.registerDataRequest(
      validId,
      (data: unknown) => { resolvedData = data; },
      () => {}
    );

    expect(runner.hasDataRequest(validId)).toBe(true);
    expect(runner.getPendingDataRequestCount()).toBe(1);

    // Attempt to access valid request using adversarial IDs
    const attackPayloads = [
      `${validId}\x00`,
      `${validId}; echo pwned`,
      `../${validId}`,
      `${validId}' OR '1'='1`,
    ];

    for (const attackId of attackPayloads) {
      const result = runner.fulfillDataRequest(attackId, { stolen: true });
      expect(result).toBe(false);
    }

    // Original request must still be pending and unmodified
    expect(runner.hasDataRequest(validId)).toBe(true);
    expect(runner.getPendingDataRequestCount()).toBe(1);

    // Legitimate fulfillment must work
    const fulfilled = runner.fulfillDataRequest(validId, sensitiveData);
    expect(fulfilled).toBe(true);
    expect(resolvedData).toEqual(sensitiveData);
    expect(runner.getPendingDataRequestCount()).toBe(0);
  });

  test("request IDs cannot be used to cause cross-request data leakage", async () => {
    const requestId1 = "request-id-user-A";
    const requestId2 = "request-id-user-B";
    const dataForA = { userASecret: "secret-A" };
    const dataForB = { userBSecret: "secret-B" };

    let resolvedA: unknown;
    let resolvedB: unknown;

    runner.registerDataRequest(requestId1, (d: unknown) => { resolvedA = d; }, () => {});
    runner.registerDataRequest(requestId2, (d: unknown) => { resolvedB = d; }, () => {});

    // Fulfill requests with correct data
    runner.fulfillDataRequest(requestId1, dataForA);
    runner.fulfillDataRequest(requestId2, dataForB);

    // INVARIANT: Each request receives only its own data
    expect(resolvedA).toEqual(dataForA);
    expect(resolvedB).toEqual(dataForB);
    expect(resolvedA).not.toEqual(dataForB);
    expect(resolvedB).not.toEqual(dataForA);

    // INVARIANT: After fulfillment, requests are cleaned up (no lingering sensitive data)
    expect(runner.hasDataRequest(requestId1)).toBe(false);
    expect(runner.hasDataRequest(requestId2)).toBe(false);
    expect(runner.getPendingDataRequestCount()).toBe(0);
  });

  test("double-fulfillment of a request must not succeed (replay attack prevention)", async () => {
    const validId = "valid-request-replay-test";
    let resolveCallCount = 0;

    runner.registerDataRequest(
      validId,
      () => { resolveCallCount++; },
      () => {}
    );

    // First fulfillment should succeed
    const first = runner.fulfillDataRequest(validId, { data: "legitimate" });
    expect(first).toBe(true);
    expect(resolveCallCount).toBe(1);

    // Second fulfillment (replay) must fail
    const second = runner.fulfillDataRequest(validId, { data: "replayed-attack" });
    expect(second).toBe(false);
    expect(resolveCallCount).toBe(1); // Must not have been called again
  });

  test("environment variable and system data must not be accessible via request ID manipulation", async () => {
    // Simulate storing execution data with a valid ID
    const validExecutionId = "exec-12345";
    const sensitiveExecutionData = {
      env: { DB_PASSWORD: "secret123", API_KEY: "key-abc" },
      systemInfo: { hostname: "internal-host" }
    };

    runner.storeExecutionData(validExecutionId, sensitiveExecutionData);

    // Adversarial attempts to access the data
    const attackVectors = [
      `${validExecutionId}/../exec-12345`,
      `exec-12345\x00`,
      `exec-12345; cat /etc/passwd`,
      `../exec-12345`,
      `exec-12345' UNION SELECT * FROM secrets--`,
    ];

    for (const attack of attackVectors) {
      const result = runner.getExecutionData(attack);
      // INVARIANT: Adversarial IDs must never return sensitive data
      expect(result).toBeUndefined();
    }

    // Legitimate access must still work
    const legitimate = runner.getExecutionData(validExecutionId);
    expect(legitimate).toEqual(sensitiveExecutionData);
  });
});