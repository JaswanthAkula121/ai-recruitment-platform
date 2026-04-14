"use client";

import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

const API_URL =
  "https://ai-recruitment-platform-production.up.railway.app";

type PipelineStatus = "applied" | "interview" | "hired" | "rejected";

type Application = {
  id: string;
  jobId: string;
  candidateId: string;
  status?: PipelineStatus;
};

type PipelineResponse = Record<PipelineStatus, Application[]>;

type DraggedApplication = {
  id: string;
  fromStatus: PipelineStatus;
};

type CreateApplicationInput = {
  jobId: string;
  candidateId: string;
  status: PipelineStatus;
};

const PIPELINE_COLUMNS = [
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
] as const;

const EMPTY_PIPELINE: PipelineResponse = {
  applied: [],
  interview: [],
  hired: [],
  rejected: [],
};

function normalizePipeline(data: unknown): PipelineResponse {
  if (!data || typeof data !== "object") return EMPTY_PIPELINE;

  const pipeline = data as Partial<Record<PipelineStatus, unknown>>;

  return {
    applied: Array.isArray(pipeline.applied)
      ? (pipeline.applied as Application[])
      : [],
    interview: Array.isArray(pipeline.interview)
      ? (pipeline.interview as Application[])
      : [],
    hired: Array.isArray(pipeline.hired)
      ? (pipeline.hired as Application[])
      : [],
    rejected: Array.isArray(pipeline.rejected)
      ? (pipeline.rejected as Application[])
      : [],
  };
}

function moveApplication(
  current: PipelineResponse,
  id: string,
  from: PipelineStatus,
  to: PipelineStatus,
): PipelineResponse {
  if (from === to) return current;

  const item = current[from].find((app) => app.id === id);
  if (!item) return current;

  return {
    ...current,
    [from]: current[from].filter((app) => app.id !== id),
    [to]: [{ ...item, status: to }, ...current[to]],
  };
}

export default function PipelineDashboard() {
  const [pipeline, setPipeline] = useState<PipelineResponse>(EMPTY_PIPELINE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragged, setDragged] = useState<DraggedApplication | null>(null);

  const [createForm, setCreateForm] = useState({
    jobId: "",
    candidateId: "",
  });

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPipeline();
  }, []);

  async function loadPipeline() {
    try {
      const res = await fetch(`${API_URL}/applications/pipeline`);
      if (!res.ok) throw new Error();

      const data = await res.json();
      setPipeline(normalizePipeline(data));
      setError(null);
    } catch {
      setError("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    applicationId: string,
    status: PipelineStatus,
  ) {
    const res = await fetch(
      `${API_URL}/applications/${applicationId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );

    if (!res.ok) throw new Error();
  }

  async function createApplication(payload: CreateApplicationInput) {
    const res = await fetch(`${API_URL}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error();
    return res.json();
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!createForm.jobId || !createForm.candidateId) {
      setError("Enter jobId and candidateId");
      return;
    }

    setCreating(true);

    try {
      const created = await createApplication({
        jobId: createForm.jobId,
        candidateId: createForm.candidateId,
        status: "applied",
      });

      setPipeline((prev) => ({
        ...prev,
        applied: [created, ...prev.applied],
      }));

      setCreateForm({
        jobId: "",
        candidateId: "",
      });

      setShowModal(false);
      setError(null);
    } catch {
      setError("Unable to create application.");
    } finally {
      setCreating(false);
    }
  }

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    id: string,
    fromStatus: PipelineStatus,
  ) {
    e.dataTransfer.effectAllowed = "move";
    setDragged({ id, fromStatus });
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  async function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
    toStatus: PipelineStatus,
  ) {
    e.preventDefault();

    if (!dragged) return;

    const old = pipeline;

    const updated = moveApplication(
      pipeline,
      dragged.id,
      dragged.fromStatus,
      toStatus,
    );

    setPipeline(updated);

    try {
      await updateStatus(dragged.id, toStatus);
    } catch {
      setPipeline(old);
      setError("Status update failed.");
    }

    setDragged(null);
  }

  return (
    <section className="max-w-7xl mx-auto px-8 py-20">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-4xl font-bold text-white">
          Hiring Pipeline
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-3 rounded-full"
        >
          Add Application
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/20 text-red-100 p-4 rounded-xl">
          {error}
        </div>
      )}

      <LayoutGroup>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE_COLUMNS.map((column) => (
            <div
              key={column.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.key)}
              className="rounded-3xl bg-white/10 p-5"
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                {column.label}
              </h2>

              <div className="space-y-4">
                <AnimatePresence>
                  {(loading ? [] : pipeline[column.key]).map(
                    (application) => (
                      <motion.div
                        key={application.id}
                        layout
                        draggable={true}
                        onDragStart={(e: any) =>
                          handleDragStart(
                            e,
                            application.id,
                            column.key,
                          )
                        }
                        className="bg-white/10 rounded-2xl p-4 text-white cursor-grab"
                      >
                        <p className="font-semibold">
                          {application.id}
                        </p>

                        <p className="text-sm mt-2">
                          Job: {application.jobId}
                        </p>

                        <p className="text-sm">
                          Candidate: {application.candidateId}
                        </p>
                      </motion.div>
                    ),
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </LayoutGroup>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex justify-center items-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={handleCreate}
              className="bg-slate-900 p-6 rounded-3xl w-full max-w-lg"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <h2 className="text-2xl text-white font-semibold mb-6">
                Add Application
              </h2>

              <input
                name="jobId"
                placeholder="Job ID"
                value={createForm.jobId}
                onChange={handleInput}
                className="w-full mb-4 p-3 rounded-xl"
              />

              <input
                name="candidateId"
                placeholder="Candidate ID"
                value={createForm.candidateId}
                onChange={handleInput}
                className="w-full mb-6 p-3 rounded-xl"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full bg-white/10 text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-full bg-blue-600 text-white"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}