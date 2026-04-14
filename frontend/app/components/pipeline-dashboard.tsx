"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
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

const PIPELINE_COLUMNS: Array<{
  key: PipelineStatus;
  label: string;
  accent: string;
  badge: string;
  glow: string;
  border: string;
}> = [
  {
    key: "applied",
    label: "Applied",
    accent: "from-blue-500/25 via-sky-400/12 to-transparent",
    badge: "border-blue-300/20 bg-blue-400/10 text-blue-100",
    glow: "from-blue-400/30 to-violet-400/10",
    border: "border-blue-300/15",
  },
  {
    key: "interview",
    label: "Interview",
    accent: "from-violet-500/25 via-fuchsia-400/12 to-transparent",
    badge: "border-violet-300/20 bg-violet-400/10 text-violet-100",
    glow: "from-violet-400/30 to-blue-400/10",
    border: "border-violet-300/15",
  },
  {
    key: "hired",
    label: "Hired",
    accent: "from-cyan-500/25 via-blue-400/12 to-transparent",
    badge: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    glow: "from-cyan-400/30 to-blue-400/10",
    border: "border-cyan-300/15",
  },
  {
    key: "rejected",
    label: "Rejected",
    accent: "from-slate-500/25 via-violet-400/10 to-transparent",
    badge: "border-slate-300/20 bg-slate-200/10 text-slate-100",
    glow: "from-slate-300/20 to-violet-400/10",
    border: "border-slate-200/15",
  },
];

const EMPTY_PIPELINE: PipelineResponse = {
  applied: [],
  interview: [],
  hired: [],
  rejected: [],
};

function normalizePipeline(data: unknown): PipelineResponse {
  if (!data || typeof data !== "object") {
    return EMPTY_PIPELINE;
  }

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
  currentPipeline: PipelineResponse,
  applicationId: string,
  fromStatus: PipelineStatus,
  toStatus: PipelineStatus,
): PipelineResponse {
  if (fromStatus === toStatus) return currentPipeline;

  const movedApplication = currentPipeline[fromStatus].find(
    (application) => application.id === applicationId,
  );

  if (!movedApplication) return currentPipeline;

  return {
    ...currentPipeline,
    [fromStatus]: currentPipeline[fromStatus].filter(
      (application) => application.id !== applicationId,
    ),
    [toStatus]: [
      { ...movedApplication, status: toStatus },
      ...currentPipeline[toStatus],
    ],
  };
}

export default function PipelineDashboard() {
  const [pipeline, setPipeline] = useState<PipelineResponse>(EMPTY_PIPELINE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    jobId: "",
    candidateId: "",
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);

  const [draggedApplication, setDraggedApplication] =
    useState<DraggedApplication | null>(null);

  const [activeDropColumn, setActiveDropColumn] =
    useState<PipelineStatus | null>(null);

  const [pendingApplicationIds, setPendingApplicationIds] = useState<string[]>(
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchPipeline() {
      try {
        const response = await fetch(`${API_URL}/applications/pipeline`);

        if (!response.ok) {
          throw new Error(`Unable to load pipeline (${response.status})`);
        }

        const data = await response.json();

        if (isMounted) {
          setPipeline(normalizePipeline(data));
          setError(null);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load pipeline.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPipeline();

    return () => {
      isMounted = false;
    };
  }, []);

  async function updateApplicationStatus(
    applicationId: string,
    nextStatus: PipelineStatus,
  ) {
    const response = await fetch(
      `${API_URL}/applications/${applicationId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      },
    );

    if (!response.ok) {
      throw new Error(`Unable to update application (${response.status})`);
    }
  }

  async function createApplication(
    payload: CreateApplicationInput,
  ): Promise<Application> {
    const response = await fetch(`${API_URL}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Unable to create application (${response.status})`);
    }

    return response.json();
  }

  function handleCreateInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateApplication(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const jobId = createForm.jobId.trim();
    const candidateId = createForm.candidateId.trim();

    if (!jobId || !candidateId) {
      setError("Please enter jobId and candidateId.");
      return;
    }

    setIsCreatingApplication(true);

    try {
      const created = await createApplication({
        jobId,
        candidateId,
        status: "applied",
      });

      setPipeline((current) => ({
        ...current,
        applied: [created, ...current.applied],
      }));

      setCreateForm({
        jobId: "",
        candidateId: "",
      });

      setIsCreateModalOpen(false);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create application.",
      );
    } finally {
      setIsCreatingApplication(false);
    }
  }

  function handleDragStart(
    event: DragEvent<HTMLElement>,
    applicationId: string,
    fromStatus: PipelineStatus,
  ) {
    event.dataTransfer.effectAllowed = "move";

    setDraggedApplication({
      id: applicationId,
      fromStatus,
    });
  }

  function handleDragEnd() {
    setDraggedApplication(null);
    setActiveDropColumn(null);
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>,
    columnStatus: PipelineStatus,
  ) {
    event.preventDefault();
    setActiveDropColumn(columnStatus);
  }

  async function handleDrop(
    event: DragEvent<HTMLDivElement>,
    toStatus: PipelineStatus,
  ) {
    event.preventDefault();

    if (!draggedApplication) return;

    const previousPipeline = pipeline;

    const nextPipeline = moveApplication(
      pipeline,
      draggedApplication.id,
      draggedApplication.fromStatus,
      toStatus,
    );

    setPipeline(nextPipeline);

    try {
      await updateApplicationStatus(draggedApplication.id, toStatus);
    } catch (err) {
      setPipeline(previousPipeline);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update application status.",
      );
    } finally {
      setDraggedApplication(null);
      setActiveDropColumn(null);
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-8 py-20">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-4xl font-bold text-white">Hiring Pipeline</h2>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-full bg-blue-600 px-5 py-3 text-white font-semibold"
        >
          Add Application
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/20 p-4 text-red-100">
          {error}
        </div>
      )}

      <LayoutGroup>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE_COLUMNS.map((column) => {
            const applications = pipeline[column.key];

            return (
              <div
                key={column.key}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDrop={(e) => void handleDrop(e, column.key)}
                className="rounded-3xl bg-white/10 p-5"
              >
                <h3 className="mb-4 text-xl font-semibold text-white">
                  {column.label} ({applications.length})
                </h3>

                <div className="space-y-4">
                  <AnimatePresence>
                    {applications.map((application) => (
                      <motion.div
                        key={application.id}
                        layout
                        draggable
                        onDragStart={(e) =>
                          handleDragStart(e, application.id, column.key)
                        }
                        onDragEnd={handleDragEnd}
                        className="rounded-2xl bg-white/10 p-4 text-white cursor-grab"
                      >
                        <p className="font-semibold">{application.id}</p>
                        <p className="text-sm mt-2">
                          Job: {application.jobId}
                        </p>
                        <p className="text-sm">
                          Candidate: {application.candidateId}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={handleCreateApplication}
              className="w-full max-w-lg rounded-3xl bg-slate-900 p-6"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <h3 className="text-2xl font-semibold text-white mb-6">
                Add Application
              </h3>

              <input
                name="jobId"
                placeholder="Job ID"
                value={createForm.jobId}
                onChange={handleCreateInputChange}
                className="mb-4 w-full rounded-xl p-3"
              />

              <input
                name="candidateId"
                placeholder="Candidate ID"
                value={createForm.candidateId}
                onChange={handleCreateInputChange}
                className="mb-6 w-full rounded-xl p-3"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full bg-white/10 px-4 py-2 text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingApplication}
                  className="rounded-full bg-blue-600 px-5 py-2 text-white"
                >
                  {isCreatingApplication ? "Creating..." : "Create"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}