"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

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

const STAT_CARDS: Array<{
  key: "total" | PipelineStatus;
  label: string;
  valueClassName: string;
  glow: string;
}> = [
  {
    key: "total",
    label: "Total Applications",
    valueClassName: "text-white",
    glow: "from-white/18 via-blue-400/12 to-violet-400/12",
  },
  {
    key: "applied",
    label: "Applied",
    valueClassName: "text-blue-100",
    glow: "from-blue-400/22 via-sky-400/12 to-transparent",
  },
  {
    key: "interview",
    label: "Interview",
    valueClassName: "text-violet-100",
    glow: "from-violet-400/22 via-fuchsia-400/12 to-transparent",
  },
  {
    key: "hired",
    label: "Hired",
    valueClassName: "text-cyan-100",
    glow: "from-cyan-400/22 via-blue-400/12 to-transparent",
  },
  {
    key: "rejected",
    label: "Rejected",
    valueClassName: "text-slate-100",
    glow: "from-slate-300/18 via-violet-400/10 to-transparent",
  },
];

const statsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.96,
    transition: { duration: 0.2, ease: "easeInOut" as const },
  },
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
    hired: Array.isArray(pipeline.hired) ? (pipeline.hired as Application[]) : [],
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
  if (fromStatus === toStatus) {
    return currentPipeline;
  }

  const movedApplication = currentPipeline[fromStatus].find(
    (application) => application.id === applicationId,
  );

  if (!movedApplication) {
    return currentPipeline;
  }

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);
  const [createForm, setCreateForm] = useState({
    jobId: "",
    candidateId: "",
  });
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
        const response = await fetch("http://localhost:3000/applications/pipeline");

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
              : "Unable to load the application pipeline right now.",
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

  const totalApplications = Object.values(pipeline).reduce(
    (count, applications) => count + applications.length,
    0,
  );
  const statusCounts: Record<PipelineStatus, number> = {
    applied: pipeline.applied.length,
    interview: pipeline.interview.length,
    hired: pipeline.hired.length,
    rejected: pipeline.rejected.length,
  };

  async function updateApplicationStatus(
    applicationId: string,
    nextStatus: PipelineStatus,
  ) {
    const response = await fetch(
      `http://localhost:3000/applications/${applicationId}/status`,
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
    const response = await fetch("http://localhost:3000/applications", {
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

  function resetCreateForm() {
    setCreateForm({
      jobId: "",
      candidateId: "",
    });
  }

  function openCreateModal() {
    setError(null);
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (isCreatingApplication) {
      return;
    }

    setIsCreateModalOpen(false);
    resetCreateForm();
  }

  function handleCreateInputChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const { name, value } = event.target;

    setCreateForm((currentForm) => ({
      ...currentForm,
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
      setError("Please enter both jobId and candidateId.");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticApplication: Application = {
      id: tempId,
      jobId,
      candidateId,
      status: "applied",
    };

    setIsCreatingApplication(true);
    setError(null);
    setPipeline((currentPipeline) => ({
      ...currentPipeline,
      applied: [optimisticApplication, ...currentPipeline.applied],
    }));
    setPendingApplicationIds((currentIds) => [
      ...new Set([...currentIds, tempId]),
    ]);

    try {
      const createdApplication = await createApplication({
        jobId,
        candidateId,
        status: "applied",
      });

      setPipeline((currentPipeline) => ({
        ...currentPipeline,
        applied: currentPipeline.applied.map((application) =>
          application.id === tempId ? createdApplication : application,
        ),
      }));
      setIsCreateModalOpen(false);
      resetCreateForm();
    } catch (createError) {
      setPipeline((currentPipeline) => ({
        ...currentPipeline,
        applied: currentPipeline.applied.filter(
          (application) => application.id !== tempId,
        ),
      }));
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the application right now.",
      );
    } finally {
      setPendingApplicationIds((currentIds) =>
        currentIds.filter((id) => id !== tempId),
      );
      setIsCreatingApplication(false);
    }
  }

  function handleDragStart(
    event: DragEvent<HTMLElement>,
    applicationId: string,
    fromStatus: PipelineStatus,
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ id: applicationId, fromStatus }),
    );

    setDraggedApplication({ id: applicationId, fromStatus });
    setError(null);
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
    event.dataTransfer.dropEffect = "move";
    setActiveDropColumn(columnStatus);
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>,
    columnStatus: PipelineStatus,
  ) {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    if (activeDropColumn === columnStatus) {
      setActiveDropColumn(null);
    }
  }

  async function handleDrop(
    event: DragEvent<HTMLDivElement>,
    toStatus: PipelineStatus,
  ) {
    event.preventDefault();

    const transferredData = event.dataTransfer.getData("text/plain");
    const parsedData =
      transferredData.length > 0
        ? (JSON.parse(transferredData) as DraggedApplication)
        : draggedApplication;
    const applicationData = parsedData ?? draggedApplication;

    setActiveDropColumn(null);
    setDraggedApplication(null);

    if (!applicationData || applicationData.fromStatus === toStatus) {
      return;
    }

    const previousPipeline = pipeline;
    const nextPipeline = moveApplication(
      pipeline,
      applicationData.id,
      applicationData.fromStatus,
      toStatus,
    );

    if (nextPipeline === pipeline) {
      return;
    }

    setPipeline(nextPipeline);
    setPendingApplicationIds((currentIds) => [
      ...new Set([...currentIds, applicationData.id]),
    ]);
    setError(null);

    try {
      await updateApplicationStatus(applicationData.id, toStatus);
    } catch (updateError) {
      setPipeline(previousPipeline);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update the application status right now.",
      );
    } finally {
      setPendingApplicationIds((currentIds) =>
        currentIds.filter((id) => id !== applicationData.id),
      );
    }
  }

  return (
    <section className="relative max-w-7xl mx-auto px-8 py-24">
      <div className="pointer-events-none absolute inset-x-8 top-10 -z-10 h-56 rounded-full bg-gradient-to-r from-blue-500/20 via-violet-500/16 to-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-24 -z-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/12 bg-white/10 p-8 shadow-[0_32px_120px_rgba(2,6,23,0.58)] backdrop-blur-2xl md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(167,139,250,0.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-blue-100 backdrop-blur">
              Hiring Pipeline
            </span>
            <div className="space-y-3">
              <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Track every application across your hiring funnel.
              </h2>
              <p className="max-w-xl text-base leading-7 text-slate-300 md:text-lg">
                Live data from your NestJS backend, organized into a polished
                recruiting board that feels at home in a premium SaaS product.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={openCreateModal}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-gradient-to-r from-blue-400/20 via-violet-400/20 to-blue-300/10 px-5 py-3 text-sm font-semibold tracking-wide text-white shadow-[0_16px_40px_rgba(59,130,246,0.18)] backdrop-blur transition hover:border-white/20"
          >
            Add Application
          </motion.button>
        </div>

        {error ? (
          <div className="relative mt-8 rounded-[1.4rem] border border-rose-300/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100 backdrop-blur">
            {error}
          </div>
        ) : null}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={statsContainerVariants}
          className="relative mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          {STAT_CARDS.map((statCard) => {
            const value =
              statCard.key === "total"
                ? totalApplications
                : statusCounts[statCard.key];

            return (
              <motion.div
                key={statCard.key}
                variants={statCardVariants}
                className={`group rounded-[1.45rem] bg-gradient-to-br p-px ${statCard.glow}`}
              >
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="h-full rounded-[1.4rem] border border-white/10 bg-white/10 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.26),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition duration-300 group-hover:bg-white/12"
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                    {statCard.label}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p
                      className={`text-3xl font-semibold tracking-tight ${statCard.valueClassName}`}
                    >
                      {isLoading ? "--" : value}
                    </p>
                    <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Live
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        <LayoutGroup id="pipeline-board">
          <div className="relative mt-10 grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
          {PIPELINE_COLUMNS.map((column) => {
            const applications = pipeline[column.key];
            const isDropTarget =
              activeDropColumn === column.key &&
              draggedApplication?.fromStatus !== column.key;

            return (
              <motion.div
                layout
                key={column.key}
                onDragOver={(event) => handleDragOver(event, column.key)}
                onDragLeave={(event) => handleDragLeave(event, column.key)}
                onDrop={(event) => void handleDrop(event, column.key)}
                transition={{ layout: { duration: 0.28, ease: "easeInOut" } }}
                className={`group relative overflow-hidden rounded-[1.75rem] border bg-white/10 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-300 ${
                  isDropTarget
                    ? "border-white/30 -translate-y-1 ring-2 ring-violet-300/20"
                    : `${column.border} hover:-translate-y-1 hover:border-white/20`
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${column.accent}`}
                />
                <div
                  className={`pointer-events-none absolute -right-8 top-4 h-24 w-24 rounded-full bg-gradient-to-br ${column.glow} blur-2xl transition duration-300 group-hover:scale-110`}
                />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${column.glow}`}
                      />
                      <h3 className="text-lg font-semibold tracking-tight text-white md:text-xl">
                        {column.label}{" "}
                        <span className="text-slate-300">
                          ({isLoading ? "--" : applications.length})
                        </span>
                      </h3>
                    </div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                      {column.key}
                    </p>
                    <p className="text-sm leading-6 text-slate-300">
                      {isLoading
                        ? "Fetching applications..."
                        : isDropTarget
                          ? "Release to update status"
                          : "Drag cards between stages"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur ${column.badge}`}
                  >
                    {isLoading ? "--" : applications.length}
                  </span>
                </div>

                <motion.div layout className="relative mt-6 min-h-28 space-y-4">
                  {isLoading
                    ? Array.from({ length: 2 }).map((_, index) => (
                        <motion.div
                          key={`${column.key}-skeleton-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.05 }}
                          className="rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur"
                        >
                          <div className="h-4 w-24 rounded bg-white/10" />
                          <div className="mt-4 space-y-2">
                            <div className="h-3 w-full rounded bg-white/10" />
                            <div className="h-3 w-5/6 rounded bg-white/10" />
                          </div>
                        </motion.div>
                      ))
                    : applications.length > 0
                      ? (
                        <AnimatePresence initial={false} mode="popLayout">
                          {applications.map((application) => {
                            const isPending = pendingApplicationIds.includes(
                              application.id,
                            );
                            const isDragging =
                              draggedApplication?.id === application.id;

                            return (
                              <motion.article
                                layout
                                layoutId={`application-${application.id}`}
                                key={application.id}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                whileHover={
                                  isPending
                                    ? undefined
                                    : { scale: 1.02, y: -4 }
                                }
                                transition={{
                                  layout: { duration: 0.3, ease: "easeInOut" },
                                  duration: 0.2,
                                  ease: "easeOut",
                                }}
                                draggable={!isPending}
                                onDragStart={(event) =>
                                  handleDragStart(event, application.id, column.key)
                                }
                                onDragEnd={handleDragEnd}
                                className={`group/card relative overflow-hidden rounded-[1.35rem] border border-white/12 bg-white/10 p-4 shadow-[0_14px_32px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition duration-300 ${
                                  isPending
                                    ? "cursor-progress opacity-70"
                                    : "cursor-grab active:cursor-grabbing hover:border-white/20 hover:bg-white/12 hover:shadow-[0_22px_40px_rgba(2,6,23,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]"
                                } ${isDragging ? "scale-[0.98] opacity-40" : ""}`}
                              >
                                <div
                                  className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${column.accent} opacity-70`}
                                />

                                <div className="relative flex items-start justify-between gap-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                    Application
                                  </p>
                                  {isPending ? (
                                    <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100 backdrop-blur">
                                      Updating
                                    </span>
                                  ) : null}
                                </div>

                                <p className="relative mt-3 break-all text-sm font-semibold leading-6 text-white">
                                  {application.id}
                                </p>
                                <div className="relative mt-4 space-y-3 text-sm text-slate-300">
                                  <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                                      Job ID
                                    </p>
                                    <p className="mt-1 break-all text-sm text-slate-200">
                                      {application.jobId}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                                      Candidate ID
                                    </p>
                                    <p className="mt-1 break-all text-sm text-slate-200">
                                      {application.candidateId}
                                    </p>
                                  </div>
                                </div>
                              </motion.article>
                            );
                          })}
                        </AnimatePresence>
                      )
                      : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className={`rounded-[1.35rem] border border-dashed p-6 text-sm backdrop-blur transition ${
                            isDropTarget
                              ? "border-white/30 bg-white/12 text-white shadow-[0_14px_28px_rgba(30,41,59,0.24)]"
                              : "border-white/10 bg-white/5 text-slate-400"
                          }`}
                        >
                          {isDropTarget
                            ? "Drop the application here to move it."
                            : "No applications in this stage yet."}
                        </motion.div>
                      )}
                </motion.div>
              </motion.div>
            );
          })}
          </div>
        </LayoutGroup>
      </div>

      <AnimatePresence>
        {isCreateModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
            onClick={closeCreateModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/12 bg-white/10 p-6 shadow-[0_28px_90px_rgba(2,6,23,0.55)] backdrop-blur-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(167,139,250,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))]" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-100">
                      New Record
                    </span>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-white">
                        Add Application
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Create a new application and place it directly into the
                        Applied stage.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <form
                  onSubmit={handleCreateApplication}
                  className="mt-8 space-y-5"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="jobId"
                      className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400"
                    >
                      Job ID
                    </label>
                    <input
                      id="jobId"
                      name="jobId"
                      value={createForm.jobId}
                      onChange={handleCreateInputChange}
                      placeholder="Enter job UUID"
                      autoComplete="off"
                      className="w-full rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none backdrop-blur transition placeholder:text-slate-500 focus:border-blue-300/30 focus:bg-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="candidateId"
                      className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400"
                    >
                      Candidate ID
                    </label>
                    <input
                      id="candidateId"
                      name="candidateId"
                      value={createForm.candidateId}
                      onChange={handleCreateInputChange}
                      placeholder="Enter candidate UUID"
                      autoComplete="off"
                      className="w-full rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none backdrop-blur transition placeholder:text-slate-500 focus:border-violet-300/30 focus:bg-white/10"
                    />
                  </div>

                  <div className="rounded-[1.1rem] border border-white/10 bg-black/15 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                      Default Status
                    </p>
                    <p className="mt-1 text-sm font-medium text-blue-100">
                      Applied
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeCreateModal}
                      disabled={isCreatingApplication}
                      className="rounded-full border border-white/10 bg-black/15 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      whileHover={
                        isCreatingApplication ? undefined : { y: -2, scale: 1.01 }
                      }
                      whileTap={
                        isCreatingApplication ? undefined : { scale: 0.98 }
                      }
                      disabled={isCreatingApplication}
                      className="rounded-full border border-white/15 bg-gradient-to-r from-blue-400/30 via-violet-400/25 to-blue-300/15 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(99,102,241,0.2)] transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingApplication ? "Creating..." : "Create Application"}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
