import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "./contact-form";

export default async function ContactPage() {
  // Auto-brand to whichever client this instance is deployed for. Falls back
  // gracefully if no business row exists yet.
  const business = await prisma.business.findFirst();
  const heading = business?.name ?? "Get in touch";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{heading}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Tell us what you need and we&apos;ll get back to you shortly.
          </p>
        </div>
        <Card className="p-6">
          <CardContent className="px-0">
            <ContactForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
