"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SCENARIOS = [
  {
    label: "Emergency HVAC repair",
    source: "sms",
    rawMessage: "My furnace just died and it's freezing in here!! Need someone ASAP today. 555-822-1199",
  },
  {
    label: "Dental appointment request",
    source: "website_form",
    rawMessage: "Hi, I'd like to schedule a cleaning sometime next week. jane@example.com",
  },
  {
    label: "Real estate viewing",
    source: "email",
    rawMessage: "Interested in viewing the property on Maple St this weekend if possible, thanks!",
  },
  {
    label: "Agency discovery call",
    source: "website_form",
    rawMessage: "We're looking for a marketing agency to help with our Q4 launch, can we set up a consult?",
  },
  {
    label: "Spam / low-quality lead",
    source: "email",
    rawMessage: "Get rich with crypto! Click here now, loan approved instantly!",
  },
] as const;

export function IntakeClient() {
  const router = useRouter();
  const [freeText, setFreeText] = useState("");
  const [source, setSource] = useState("sms");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(rawMessage: string, source: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawMessage, source }),
      });
      if (!res.ok) {
        setError("Couldn't create that lead — the intake pipeline returned an error. Try again.");
        return;
      }
      router.push("/inbox");
      router.refresh();
    } catch {
      setError("Couldn't reach the intake pipeline — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2">
        {SCENARIOS.map((scenario) => (
          <Button
            key={scenario.label}
            variant="outline"
            disabled={submitting}
            onClick={() => submit(scenario.rawMessage, scenario.source)}
            className="h-auto justify-start whitespace-normal py-3 text-left"
          >
            {scenario.label}
          </Button>
        ))}
      </div>

      <div className="max-w-md">
        <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">Paste any inbound message</div>
        <Textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
          placeholder="e.g. a real customer message you want to test"
        />
        <div className="mt-2 flex items-center gap-2">
          <select
            className="rounded-md border border-gray-200 px-2 py-1 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="website_form">Website form</option>
            <option value="missed_call">Missed call</option>
          </select>
          <Button size="sm" disabled={submitting || !freeText.trim()} onClick={() => submit(freeText, source)}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
