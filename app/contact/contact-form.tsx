"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  // Real but forgiving: name and message are required, plus at least one way to
  // reach the customer back (email OR phone). Email is intentionally NOT
  // format-validated in a blocking way — a minor typo must never drop a real
  // lead (the backend is deliberately lenient for the same reason).
  const trimmedName = name.trim();
  const trimmedMessage = message.trim();
  const hasContact = email.trim().length > 0 || phone.trim().length > 0;
  const canSubmit =
    trimmedName.length > 0 && trimmedMessage.length > 0 && hasContact && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawMessage: trimmedMessage,
          source: "website_form",
          name: trimmedName,
          // Omit blank contact fields entirely so the pipeline treats them as
          // "not provided" rather than an empty string.
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        }),
      });
      if (!res.ok) {
        setError("Something went wrong sending your request. Please try again.");
        return;
      }
      setSubmittedName(trimmedName);
    } catch {
      setError("We couldn't reach our servers — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedName) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Thanks, {submittedName}!</h2>
          <p className="mt-1 text-sm text-gray-600">
            We&apos;ve got your request and will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-gray-700">
          Name
        </label>
        <Input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="contact-phone" className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <Input
          id="contact-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 000-0000"
          autoComplete="tel"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-gray-700">
          How can we help you?
        </label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Tell us a bit about what you need…"
        />
      </div>

      {!hasContact && (trimmedName.length > 0 || trimmedMessage.length > 0) && (
        <p className="text-xs text-gray-500">
          Add an email or phone number so we can get back to you.
        </p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
        {submitting ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
