import { IntakeClient } from "./intake-client";

export default function IntakePage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-gray-900">Quick Intake</h1>
      <p className="mb-5 text-xs text-gray-400">
        Every button below calls the real lead intake pipeline — same endpoint a live website form would use.
      </p>
      <IntakeClient />
    </div>
  );
}
