zTracing conventions:

- OpenTelemetry is the canonical tracing interface
- trace initialization belongs to platform bootstrap, not feature code
- critical workflows: request handling, ingestion, retrieval, generation, task execution
