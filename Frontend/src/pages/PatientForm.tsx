// The public Patient Application form. It's a two-step "wizard":
//   Step 1 — basic info: name, email, contact number  ->  [Next]
//   Step 2 — eligibility questionnaire                 ->  [Back] [Submit]
// Splitting it is purely a frontend concern: we still send ONE POST at the end with all
// the data. We just show the fields on two screens instead of one.
//
// This restyle ports the screen onto the shared ui/ components and the visual reference
// in stitch_crp_pro_ui_design_spec/patient_application_form/code.html (logo header,
// centered card, step indicator, success state with a reference number, footer). The
// SUBMITTED PAYLOAD AND ENDPOINT ARE UNCHANGED — same createApplication() call, same
// fields (patient_name, email, contact, trial_id, answers) — so the backend sees
// exactly what it did before.

import { useState } from "react";
import { createApplication } from "../api";
import { Button } from "../ui";

// The fixed list of eligibility questions for now. Hardcoded for v1 — later, when
// trials exist (Phase 5), these can be loaded per-trial from the backend.
const QUESTIONS = [
  "What is your age?",
  "Do you have any chronic medical conditions?",
  "Are you currently taking any medications?",
];

// Submit outcome: null (idle) | "sending" | "ok" | "error".
type SubmitStatus = null | "sending" | "ok" | "error";

// Shared classes for every text input on this form (from the mockup: rounded, outlined,
// teal focus ring).
const INPUT_CLASSES =
  "w-full rounded-card border border-outline px-4 py-2.5 text-sm outline-none " +
  "transition-colors placeholder:text-outline-variant " +
  "focus:border-primary focus:ring-1 focus:ring-primary";

const LABEL_CLASSES = "block text-sm font-medium text-on-surface-variant";

function PatientForm() {
  // --- Which step is on screen: 1 (basic info) or 2 (questionnaire). ---
  const [step, setStep] = useState<1 | 2>(1);

  // --- Step 1 fields ---
  const [patientName, setPatientName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");

  // --- Step 2 fields: one answer per question, shaped how the backend wants. ---
  const [answers, setAnswers] = useState(
    QUESTIONS.map((q) => ({ question: q, answer: "" }))
  );

  // --- UI feedback ---
  // A message shown if step 1 is incomplete when the user clicks Next.
  const [stepError, setStepError] = useState("");
  const [status, setStatus] = useState<SubmitStatus>(null);
  // The id returned by the backend on a successful save.
  const [savedId, setSavedId] = useState<number | null>(null);

  // Update one answer immutably (build a NEW array; never mutate state in place).
  function handleAnswerChange(index: number, value: string) {
    setAnswers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, answer: value } : item))
    );
  }

  // Move from step 1 -> step 2. We validate the basic-info fields here ourselves
  // because the browser's built-in `required` check only runs on a real form SUBMIT,
  // and "Next" is not a submit — it just changes which step shows.
  function handleNext() {
    // .trim() so a few spaces don't count as a real answer.
    if (!patientName.trim() || !email.trim() || !contact.trim()) {
      setStepError("Please fill in your name, email, and contact number.");
      return; // stay on step 1
    }
    // All good: clear any error and advance.
    setStepError("");
    setStep(2);
  }

  // Go back to step 1 from step 2 (their typed answers are kept in state).
  function handleBack() {
    setStep(1);
  }

  // Final submit, from step 2. Sends everything in one POST.
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); // don't let the browser reload the page
    setStatus("sending");
    setSavedId(null);

    // Build the EXACT object the backend's ApplicationCreate schema expects. Unchanged
    // from the pre-restyle form.
    const payload = {
      patient_name: patientName,
      email: email,
      contact: contact,
      trial_id: null,
      answers: answers,
    };

    try {
      const saved = await createApplication(payload);
      setSavedId(saved.id);
      setStatus("ok");
      // Reset the whole form so the patient can't accidentally submit twice.
      setPatientName("");
      setEmail("");
      setContact("");
      setAnswers(QUESTIONS.map((q) => ({ question: q, answer: "" })));
      setStep(1);
    } catch (err) {
      // Log the real reason to the browser console to help debugging, but show the user
      // a friendly generic message.
      console.error("Application submit failed:", err);
      setStatus("error");
    }
  }

  // The two-segment progress indicator at the top of each step. Both segments are teal
  // on step 2; only the first is teal on step 1.
  function StepIndicator({ current }: { current: 1 | 2 }) {
    return (
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step {current} of 2
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="h-1.5 w-8 rounded-full bg-primary" />
          <div
            className={`h-1.5 w-8 rounded-full ${
              current === 2 ? "bg-primary" : "bg-surface-container-high"
            }`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Logo header — patients land here; deliberately NO staff link. */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-center border-b border-outline-variant bg-surface px-4 shadow-sm">
        <span className="text-xl font-semibold text-primary">CRP-Pro</span>
      </header>

      <main className="flex flex-grow items-center justify-center p-4">
        <div className="w-full max-w-[520px] overflow-hidden rounded-card border border-outline-variant bg-surface-container-lowest shadow-card">
          {/* Global error banner — shown only if the submit failed. */}
          {status === "error" && (
            <div className="flex items-center gap-3 border-b border-error/20 bg-error-container px-6 py-4 text-on-error-container">
              <span className="material-symbols-outlined text-error">report</span>
              <p className="text-sm">Something went wrong. Please try again.</p>
            </div>
          )}

          <div className="p-8">
            {/* ================= SUCCESS STATE ================= */}
            {status === "ok" ? (
              <div className="py-4 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <span
                    className="material-symbols-outlined text-[48px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <h1 className="mb-4 text-2xl font-bold text-on-surface">Thank you!</h1>
                <p className="mb-6 text-sm text-on-surface-variant">
                  Your application was submitted. Our clinical staff will review your
                  details and contact you via email shortly.
                </p>
                <div className="inline-block rounded-card bg-surface-container-low p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                    Application Reference
                  </p>
                  <p className="mt-1 text-xl font-semibold text-primary">
                    Ref #{savedId}
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setStatus(null)}
                    className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary-container"
                  >
                    Submit another application
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ================= STEP 1: basic info ================= */}
                {step === 1 && (
                  <div>
                    <StepIndicator current={1} />
                    <h1 className="text-2xl font-bold text-on-surface">Your details</h1>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Please provide your basic information to begin your application.
                    </p>

                    <div className="mt-6 space-y-4">
                      <div className="space-y-1.5">
                        <label className={LABEL_CLASSES} htmlFor="full-name">
                          Full name
                        </label>
                        <input
                          id="full-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className={INPUT_CLASSES}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={LABEL_CLASSES} htmlFor="email">
                          Email address
                        </label>
                        {/* type="email" makes the browser check it looks like an address. */}
                        <input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={INPUT_CLASSES}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={LABEL_CLASSES} htmlFor="phone">
                          Contact number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          className={INPUT_CLASSES}
                        />
                      </div>
                    </div>

                    {/* Validation message for step 1, only if there is one. */}
                    {stepError && <p className="mt-3 text-sm text-error">{stepError}</p>}

                    <Button onClick={handleNext} className="mt-8 w-full">
                      Next
                      <span className="material-symbols-outlined text-[20px]">
                        arrow_forward
                      </span>
                    </Button>
                  </div>
                )}

                {/* ================= STEP 2: questionnaire ================= */}
                {step === 2 && (
                  <form onSubmit={handleSubmit}>
                    <StepIndicator current={2} />
                    <h1 className="text-2xl font-bold text-on-surface">
                      Eligibility questions
                    </h1>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      A few brief questions to ensure this study is the right fit for you.
                    </p>

                    <div className="mt-6 space-y-4">
                      {answers.map((item, index) => (
                        <div key={index} className="space-y-1.5">
                          <label className={LABEL_CLASSES}>{item.question}</label>
                          <input
                            type="text"
                            value={item.answer}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                            required
                            className={INPUT_CLASSES}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={handleBack}
                        className="flex-1"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          arrow_back
                        </span>
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={status === "sending"}
                        className="flex-[2]"
                      >
                        {status === "sending" ? "Submitting…" : "Submit application"}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-on-surface-variant">
          © 2026 CRP-Pro Clinical Excellence. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default PatientForm;
