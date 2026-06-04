// The public Patient Application form, now split into TWO steps (a "wizard"):
//   Step 1 — basic info: name, email, contact number  ->  [Next]
//   Step 2 — eligibility questionnaire                 ->  [Back] [Submit]
// Splitting it is purely a frontend concern: we still send ONE POST at the end
// with all the data. We just show the fields on two screens instead of one.

import { useState } from "react";
import { createApplication } from "../api";

// The fixed list of eligibility questions for now. Hardcoded for v1 — later,
// when trials exist (Phase 5), these can be loaded per-trial from the backend.
const QUESTIONS = [
  "What is your age?",
  "Do you have any chronic medical conditions?",
  "Are you currently taking any medications?",
];

function PatientForm() {
  // --- Which step is on screen: 1 (basic info) or 2 (questionnaire). ---
  const [step, setStep] = useState(1);

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
  // Submit outcome: null | "sending" | "ok" | "error".
  const [status, setStatus] = useState(null);
  // The id returned by the backend on a successful save.
  const [savedId, setSavedId] = useState(null);

  // Update one answer immutably (build a NEW array; never mutate state in place).
  function handleAnswerChange(index, value) {
    setAnswers((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, answer: value } : item
      )
    );
  }

  // Move from step 1 -> step 2. We validate the basic-info fields here ourselves
  // because the browser's built-in `required` check only runs on a real form
  // SUBMIT, and "Next" is not a submit — it just changes which step shows.
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
  async function handleSubmit(event) {
    event.preventDefault(); // don't let the browser reload the page
    setStatus("sending");
    setSavedId(null);

    // Build the exact object the backend's ApplicationCreate schema expects
    // (now including the new `email` field).
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
      // Log the real reason to the browser console to help debugging,
      // but show the user a friendly generic message.
      console.error("Application submit failed:", err);
      setStatus("error");
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Clinical Trial Application</h1>
      {/* A tiny progress hint so the patient knows where they are. */}
      <p style={{ color: "#666" }}>Step {step} of 2</p>

      {/* ================= STEP 1: basic info ================= */}
      {/* We render step 1 ONLY when step === 1. */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <label>
              Full name
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>
              Email
              {/* type="email" makes the browser check it looks like an address. */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>
              Contact number
              <input
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>

          {/* Validation message for step 1, only if there is one. */}
          {stepError && <p style={{ color: "red" }}>{stepError}</p>}

          {/* type="button" so it does NOT submit the form — it just advances. */}
          <button type="button" onClick={handleNext}>
            Next →
          </button>
        </div>
      )}

      {/* ================= STEP 2: questionnaire ================= */}
      {step === 2 && (
        // Only this step is a real <form>, because this is where we submit.
        <form onSubmit={handleSubmit}>
          <h2>Eligibility questions</h2>
          {answers.map((item, index) => (
            <div key={index} style={{ marginBottom: "1rem" }}>
              <label>
                {item.question}
                <input
                  type="text"
                  value={item.answer}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  required
                  style={{ display: "block", width: "100%" }}
                />
              </label>
            </div>
          ))}

          <button type="button" onClick={handleBack}>
            ← Back
          </button>{" "}
          <button type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Submitting…" : "Submit application"}
          </button>
        </form>
      )}

      {/* ================= Feedback after submit ================= */}
      {status === "ok" && (
        <p style={{ color: "green" }}>
          Thank you! Your application was submitted (reference #{savedId}).
        </p>
      )}
      {status === "error" && (
        <p style={{ color: "red" }}>
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}

export default PatientForm;
