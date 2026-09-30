import {
  SpanStatusCode,
  context,
  register,
  trace,
} from "@arizeai/phoenix-otel";
import { propagation, type Span } from "@opentelemetry/api";
import { settings } from "./config.js";

let initialized = false;

export function initializeTelemetry(): void {
  if (initialized || !settings.phoenixTracingEnabled) return;
  initialized = true;
  register({
    projectName: settings.phoenixProjectName,
    url: settings.phoenixCollectorEndpoint,
    apiKey: settings.phoenixApiKey,
    batch: settings.appEnv === "production",
  });
}

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean | undefined>,
  operation: (span: Span) => Promise<T>,
): Promise<T> {
  if (!settings.phoenixTracingEnabled) return operation(noopSpan);
  const tracer = trace.getTracer("victus-webapp-backend");
  return tracer.startActiveSpan(name, async (span) => {
    setSpanAttributes(span, {
      "service.name": "victus-webapp-backend",
      "victus.component": "gateway",
      ...attributes,
    });
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

export function injectTraceHeaders(headers: Headers): Headers {
  if (!settings.phoenixTracingEnabled) return headers;
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  for (const [key, value] of Object.entries(carrier)) headers.set(key, value);
  return headers;
}

export function setSpanAttributes(
  span: Span,
  attributes: Record<string, string | number | boolean | undefined>,
): void {
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) span.setAttribute(key, value);
  }
}

const noopSpan = {
  setAttribute: () => undefined,
  setAttributes: () => undefined,
  addEvent: () => undefined,
  setStatus: () => undefined,
  updateName: () => undefined,
  end: () => undefined,
  isRecording: () => false,
  recordException: () => undefined,
  spanContext: () => ({
    traceId: "",
    spanId: "",
    traceFlags: 0,
  }),
} as unknown as Span;
