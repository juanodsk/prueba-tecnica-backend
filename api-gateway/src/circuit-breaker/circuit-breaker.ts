export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitOpenError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("El circuit breaker se encuentra abierto");
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private consecutiveFailures = 0;
  private openedAt?: number;
  private halfOpenRequestInProgress = false;

  constructor(
    private readonly failureThreshold: number,
    private readonly resetTimeoutMs: number,
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    isFailure: (result: T) => boolean = () => false,
  ): Promise<T> {
    this.prepareRequest();

    try {
      const result = await operation();

      if (isFailure(result)) {
        this.recordFailure();
      } else {
        this.recordSuccess();
      }

      return result;
    } catch (error: unknown) {
      this.recordFailure();
      throw error;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  private prepareRequest(): void {
    if (this.state === "OPEN") {
      const elapsedTime = Date.now() - (this.openedAt ?? Date.now());

      if (elapsedTime < this.resetTimeoutMs) {
        throw new CircuitOpenError(this.resetTimeoutMs - elapsedTime);
      }

      this.state = "HALF_OPEN";
    }

    if (this.state === "HALF_OPEN") {
      if (this.halfOpenRequestInProgress) {
        throw new CircuitOpenError(this.resetTimeoutMs);
      }

      this.halfOpenRequestInProgress = true;
    }
  }

  private recordSuccess(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.openedAt = undefined;
    this.halfOpenRequestInProgress = false;
  }

  private recordFailure(): void {
    if (this.state === "HALF_OPEN") {
      this.openCircuit();
      return;
    }

    this.consecutiveFailures += 1;

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state = "OPEN";
    this.openedAt = Date.now();
    this.halfOpenRequestInProgress = false;
  }
}
