"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/client";

export function RemoveAlertForm() {
  const { t, apiError } = useI18n();
  const params = useSearchParams();
  const id = Number(params.get("id"));
  const token = params.get("token") ?? "";
  const valid = Number.isSafeInteger(id) && id > 0 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  const [state, setState] = useState<"idle" | "deleting" | "done">("idle");
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);

  async function remove() {
    if (!valid || state !== "idle") return;
    setState("deleting");
    setError("");
    const response = await fetch(`/api/alerts/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (response?.ok && result?.ok) {
      setDemo(Boolean(result.demo));
      setState("done");
    } else {
      setError(apiError(result?.error));
      setState("idle");
    }
  }

  if (!valid) return <p role="alert">{t.removeAlert.invalid}</p>;
  if (state === "done") return <p role="status">{demo ? t.alertForm.demo : t.removeAlert.done}</p>;
  return (
    <div className="space-y-4">
      <p className="text-muted">{t.alerts.confirmDelete}</p>
      {error && <p role="alert" className="text-bad">{error}</p>}
      <button type="button" onClick={remove} disabled={state === "deleting"} className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink disabled:opacity-50">
        {state === "deleting" ? t.common.deleting : t.removeAlert.title}
      </button>
    </div>
  );
}
