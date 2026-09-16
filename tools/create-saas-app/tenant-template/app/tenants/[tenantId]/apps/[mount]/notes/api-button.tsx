"use client";
import { useState } from "react";
import { useSaasTenant } from "@saas-platform/sdk/tenant-react";
import { tenantFetch } from "@saas-platform/sdk/tenant";
export default function ApiButton() {
  const context = useSaasTenant(),
    [result, setResult] = useState("");
  return (
    <>
      <button
        onClick={async () => {
          const response = await tenantFetch(context, "/api/notes");
          setResult(
            response.ok
              ? "API 租户：" + (await response.json()).tenantId
              : "API 请求失败",
          );
        }}
      >
        检查 SDK fetch
      </button>
      <p>{result}</p>
    </>
  );
}
