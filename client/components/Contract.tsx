"use client";

import { useState, useCallback } from "react";
import {
  createQuiz,
  submitAnswer,
  getScore,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function AnswerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ScoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Score Config ─────────────────────────────────────────────

const SCORE_CONFIG: Record<number, { color: string; bg: string; border: string; label: string; dot: string }> = {
  0: { color: "text-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/20", label: "Incorrect", dot: "bg-[#f87171]/50" },
  1: { color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", label: "Correct!", dot: "bg-[#34d399]" },
};

// ── Main Component ───────────────────────────────────────────

type Tab = "answer" | "create" | "score";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("answer");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Create Quiz state
  const [createId, setCreateId] = useState("");
  const [createQuestion, setCreateQuestion] = useState("");
  const [createAnswer, setCreateAnswer] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Submit Answer state
  const [answerId, setAnswerId] = useState("");
  const [answerVal, setAnswerVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get Score state
  const [scoreId, setScoreId] = useState("");
  const [isGettingScore, setIsGettingScore] = useState(false);
  const [scoreResult, setScoreResult] = useState<number | null>(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCreateQuiz = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!createId.trim() || !createQuestion.trim() || !createAnswer.trim()) return setError("Fill in all fields");
    const id = parseInt(createId.trim(), 10);
    if (isNaN(id)) return setError("Quiz ID must be a number");
    setError(null);
    setIsCreating(true);
    setTxStatus("Awaiting signature...");
    try {
      await createQuiz(walletAddress, id, createQuestion.trim(), createAnswer.trim().toLowerCase());
      setTxStatus("Quiz created on-chain!");
      setCreateId("");
      setCreateQuestion("");
      setCreateAnswer("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, createId, createQuestion, createAnswer]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!answerId.trim() || !answerVal.trim()) return setError("Fill in all fields");
    const id = parseInt(answerId.trim(), 10);
    if (isNaN(id)) return setError("Quiz ID must be a number");
    setError(null);
    setIsSubmitting(true);
    setTxStatus("Awaiting signature...");
    try {
      await submitAnswer(walletAddress, walletAddress, id, answerVal.trim().toLowerCase());
      setTxStatus("Answer submitted on-chain!");
      setAnswerId("");
      setAnswerVal("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [walletAddress, answerId, answerVal]);

  const handleGetScore = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!scoreId.trim()) return setError("Enter a quiz ID");
    const id = parseInt(scoreId.trim(), 10);
    if (isNaN(id)) return setError("Quiz ID must be a number");
    setError(null);
    setIsGettingScore(true);
    setScoreResult(null);
    try {
      const result = await getScore(walletAddress, id);
      if (result !== null && result !== undefined) {
        setScoreResult(Number(result));
      } else {
        setScoreResult(0);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsGettingScore(false);
    }
  }, [walletAddress, scoreId]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "answer", label: "Answer", icon: <AnswerIcon />, color: "#34d399" },
    { key: "create", label: "Create", icon: <QuizIcon />, color: "#7c6cf0" },
    { key: "score", label: "Score", icon: <ScoreIcon />, color: "#fbbf24" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("submitted") || txStatus.includes("created") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Decentralized Quiz</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setScoreResult(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Answer Quiz */}
            {activeTab === "answer" && (
              <div className="space-y-5">
                <MethodSignature name="submit_answer" params="(user: Address, id: u32, answer: Symbol)" color="#34d399" />
                <Input label="Quiz ID" type="number" value={answerId} onChange={(e) => setAnswerId(e.target.value)} placeholder="e.g. 1" />
                <Input label="Your Answer" value={answerVal} onChange={(e) => setAnswerVal(e.target.value)} placeholder="e.g. paris" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleSubmitAnswer} disabled={isSubmitting} shimmerColor="#34d399" className="w-full">
                    {isSubmitting ? <><SpinnerIcon /> Submitting...</> : <><AnswerIcon /> Submit Answer</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to answer quizzes
                  </button>
                )}
              </div>
            )}

            {/* Create Quiz */}
            {activeTab === "create" && (
              <div className="space-y-5">
                <MethodSignature name="create_quiz" params="(id: u32, question: Symbol, answer: Symbol)" color="#7c6cf0" />
                <Input label="Quiz ID" type="number" value={createId} onChange={(e) => setCreateId(e.target.value)} placeholder="e.g. 1" />
                <Input label="Question" value={createQuestion} onChange={(e) => setCreateQuestion(e.target.value)} placeholder="e.g. What is the capital of France?" />
                <Input label="Correct Answer" value={createAnswer} onChange={(e) => setCreateAnswer(e.target.value)} placeholder="e.g. paris" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleCreateQuiz} disabled={isCreating} shimmerColor="#7c6cf0" className="w-full">
                    {isCreating ? <><SpinnerIcon /> Creating...</> : <><QuizIcon /> Create Quiz</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to create quizzes
                  </button>
                )}
              </div>
            )}

            {/* Get Score */}
            {activeTab === "score" && (
              <div className="space-y-5">
                <MethodSignature name="get_score" params="(user: Address, id: u32)" returns="-> u32" color="#fbbf24" />
                <Input label="Quiz ID" type="number" value={scoreId} onChange={(e) => setScoreId(e.target.value)} placeholder="e.g. 1" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleGetScore} disabled={isGettingScore} shimmerColor="#fbbf24" className="w-full">
                    {isGettingScore ? <><SpinnerIcon /> Fetching...</> : <><ScoreIcon /> Get My Score</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.03] py-4 text-sm text-[#fbbf24]/60 hover:border-[#fbbf24]/30 hover:text-[#fbbf24]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to check score
                  </button>
                )}

                {scoreResult !== null && (
                  <div className={cn(
                    "rounded-xl border p-4 animate-fade-in-up",
                    SCORE_CONFIG[scoreResult]?.border,
                    SCORE_CONFIG[scoreResult]?.bg
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/35">Your Score</span>
                      <span className={cn("font-mono text-2xl font-bold", SCORE_CONFIG[scoreResult]?.color)}>
                        {scoreResult}
                      </span>
                    </div>
                    <p className={cn("text-sm mt-1", SCORE_CONFIG[scoreResult]?.color)}>
                      {SCORE_CONFIG[scoreResult]?.label}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Decentralized Quiz &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["0", "1"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={cn("h-1 w-1 rounded-full", SCORE_CONFIG[parseInt(s)]?.dot, parseInt(s) === 1 && "bg-[#34d399]")} />
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 1 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
