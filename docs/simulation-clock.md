# Simulation clock and event semantics

SysSim uses a discrete-event priority queue. Browser or worker ticks only advance the simulation clock and provide a rendering cadence; arrivals and completions are processed in timestamp order, with insertion order breaking ties deterministically.

The queue represents request arrivals, node-service completions, edge transfers, timeouts, retries/fallbacks, messaging queue drains, health recovery landmarks, and final request completion. A request remains `in_flight` from its arrival event through its completion or timeout event. Recent completed traces are stored separately from currently active requests. Concurrent fan-out branches start together and join at the slowest required branch; asynchronous branches charge only their acknowledgement path.

Component latency can use fixed, uniform, normal, or log-normal distributions. The configured seed drives all sampling, so the same graph, configuration, seed, and event sequence replay exactly.

## Clock speeds

The 0.5×, 1×, 2×, 5×, and 10× controls scale simulated time advanced per real-time tick. For example, a 100 ms worker tick advances the event clock by 50 ms at 0.5× and 1,000 ms at 10×. The worker continues publishing at its fixed 100 ms UI cadence, so speed changes event throughput and simulated elapsed time, not React animation-frame frequency. A manual step advances 100 ms of base clock time using the selected multiplier.

## Runtime bounds and benchmark

The runtime caps a worker tick at 10,000 generated arrivals, 10,000 in-flight requests, and 100,000 scheduled events. It retains at most 1,000 completed requests, exposes the newest 100 traces/particles, stores 500 latency samples per component, and retains 60 one-second time-series points. Excess offered arrivals or event-capacity admissions are recorded as dropped load instead of growing memory without limit.

The automated operating-envelope benchmark exercises 100 client nodes at the documented 50,000 QPS limit for a 100 ms worker tick (5,000 arrivals). Its deliberately conservative CI budget is five seconds; it records the measured duration in the test runner and fails if the budget is exceeded.
