import { jsonOk } from "@/lib/http";

export async function GET() {
  return jsonOk({
    service: "pmo-fc",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}

