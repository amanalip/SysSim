# Analytical Reference Systems

Reference cases are deliberately small enough to calculate by hand. They are regression anchors, not claims of production accuracy.

## R1: Two-node serial latency

A client contributes 2 ms, a 2 KB transfer contributes 0.02 ms at the default modeled bandwidth, the edge contributes 10 ms, and an application server contributes 15 ms. There is no queue wait or failure.

`2 + 0.02 + 10 + 15 = 27.02 ms`

`release-version-and-reference.test.ts` constructs the real engine graph, executes one seeded request, and requires its end-to-end latency and breakdown to match 27.02 ms. Future reference systems should state inputs, closed-form expectation, tolerance, engine version, and the model limitation being isolated.
