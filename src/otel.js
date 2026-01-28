let sdk;

export async function initOtel() {
  try {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );

    const endpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces";

    sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({ url: endpoint }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    await sdk.start();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("OTel init skipped:", err?.message || err);
  }
}

export async function shutdownOtel() {
  if (sdk) {
    await sdk.shutdown();
  }
}
