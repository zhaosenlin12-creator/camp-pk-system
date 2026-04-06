import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { soundManager } from '../utils/sounds';

const SPRING_MODAL = {
  type: 'spring',
  stiffness: 240,
  damping: 24
};

function normalizeRoster(students = []) {
  return students
    .filter(Boolean)
    .map((student) => ({
      ...student,
      id: Number(student.id),
      name: String(student.name || '未命名学员'),
      avatar: student.avatar || '🎯'
    }));
}

function getRandomInt(max) {
  const limit = Math.max(0, Number(max) || 0);
  if (limit <= 1) return 0;

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const seed = new Uint32Array(1);
    window.crypto.getRandomValues(seed);
    return seed[0] % limit;
  }

  return Math.floor(Math.random() * limit);
}

function pickWinnerIndex(roster, lastWinnerId) {
  if (roster.length <= 1) return 0;

  let index = getRandomInt(roster.length);
  let guard = 0;

  while (roster[index]?.id === lastWinnerId && guard < 12) {
    index = getRandomInt(roster.length);
    guard += 1;
  }

  return index;
}

function buildSphereChips(roster, phase, activeId, selectedId) {
  if (!roster.length) return [];

  return roster.map((student, index) => {
    const ratio = index / roster.length;
    const angle = ratio * Math.PI * 2 + phase;
    const latitude = Math.sin(ratio * Math.PI * 3.2) * 0.62;
    const depth = (Math.cos(angle) + 1) / 2;
    const radiusX = 122 + latitude * 22;
    const x = Math.sin(angle) * radiusX;
    const y = latitude * 86 + Math.sin(angle * 0.72) * 14;
    const scale = 0.72 + depth * 0.5;
    const opacity = 0.26 + depth * 0.68;
    const isActive = activeId === student.id;
    const isWinner = selectedId === student.id;

    return {
      student,
      x,
      y,
      scale,
      opacity,
      zIndex: 20 + Math.round(depth * 100),
      isActive,
      isWinner
    };
  });
}

export default function RandomStudentPickerModal({
  open,
  onClose,
  students = [],
  currentClassName = '',
  onRefresh
}) {
  const [sessionRoster, setSessionRoster] = useState([]);
  const [rollingStudent, setRollingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [voiceList, setVoiceList] = useState([]);
  const timersRef = useRef([]);
  const spinTokenRef = useRef(0);
  const lastWinnerIdRef = useRef(null);
  const onCloseRef = useRef(onClose);

  const roster = useMemo(() => normalizeRoster(students), [students]);
  const displayRoster = sessionRoster.length ? sessionRoster : roster;
  const resultStudent = selectedStudent || lastResult || null;
  const highlightedResultId = spinning ? null : resultStudent?.id;
  const activeStudent = spinning
    ? (rollingStudent || displayRoster[0] || resultStudent || null)
    : (resultStudent || rollingStudent || displayRoster[0] || null);
  const sphereChips = useMemo(
    () => buildSphereChips(displayRoster, phase, activeStudent?.id, highlightedResultId),
    [activeStudent?.id, displayRoster, highlightedResultId, phase]
  );

  const clearPending = () => {
    spinTokenRef.current += 1;
    timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timersRef.current = [];

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const announceStudent = (student) => {
    if (!student || typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(`本次点名，${student.name}`);
    const preferredVoice = voiceList.find((voice) => /zh|Chinese|中文/i.test(`${voice.lang} ${voice.name}`));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || 'zh-CN';
    } else {
      utterance.lang = 'zh-CN';
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.04;
    utterance.volume = 1;

    try {
      window.speechSynthesis.cancel();
      if (typeof window.speechSynthesis.resume === 'function') {
        window.speechSynthesis.resume();
      }

      const timeoutId = window.setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 120);
      timersRef.current.push(timeoutId);
    } catch (error) {
      // Keep the visual result when speech fails.
    }
  };

  const finishSpin = (winner, token) => {
    if (token !== spinTokenRef.current) return;

    lastWinnerIdRef.current = winner?.id ?? null;
    setSpinning(false);
    setSelectedStudent(winner);
    setLastResult(winner);
    setRollingStudent(winner);
    setPhase((current) => current + 0.28);
    soundManager.playPickerResult();
    announceStudent(winner);
  };

  const startSpinSequence = (nextRoster) => {
    clearPending();
    const token = spinTokenRef.current;
    const winnerIndex = pickWinnerIndex(nextRoster, lastWinnerIdRef.current);
    const totalTicks = Math.max(20, Math.min(34, nextRoster.length * 3 + 10));
    let rollingIndex = getRandomInt(nextRoster.length);

    setSessionRoster(nextRoster);
    setSelectedStudent(null);
    setSpinning(true);
    setRollingStudent(nextRoster[rollingIndex]);
    setPhase((current) => current + 0.16);
    soundManager.playPickerStart();

    const step = (tick = 0) => {
      if (token !== spinTokenRef.current) return;

      if (tick >= totalTicks) {
        const timeoutId = window.setTimeout(() => {
          finishSpin(nextRoster[winnerIndex], token);
        }, 180);
        timersRef.current.push(timeoutId);
        return;
      }

      const remaining = totalTicks - tick;
      const closing = remaining <= 5;

      if (closing) {
        rollingIndex = (winnerIndex - remaining + nextRoster.length * 3) % nextRoster.length;
      } else {
        const jump = nextRoster.length > 2 ? 1 + getRandomInt(2) : 1;
        rollingIndex = (rollingIndex + jump) % nextRoster.length;
      }

      soundManager.playPickerTick(closing ? 0.72 : 1);
      startTransition(() => {
        setRollingStudent(nextRoster[rollingIndex]);
        setPhase((current) => current + (closing ? 0.24 : 0.42));
      });

      const progress = tick / totalTicks;
      const delay = progress < 0.55 ? 74 : progress < 0.82 ? 98 : 136 + Math.round((progress - 0.82) * 260);
      const timeoutId = window.setTimeout(() => step(tick + 1), delay);
      timersRef.current.push(timeoutId);
    };

    step(0);
  };

  const handleStart = async () => {
    if (spinning) return;

    let nextRoster = displayRoster;

    if (!nextRoster.length && onRefresh) {
      try {
        const refreshedStudents = await onRefresh();
        const normalizedRefreshed = normalizeRoster(refreshedStudents);
        if (normalizedRefreshed.length > 0) {
          nextRoster = normalizedRefreshed;
        }
      } catch (error) {
        // Keep the current roster when refresh fails.
      }
    }

    if (!nextRoster.length) {
      setSelectedStudent(null);
      setRollingStudent(null);
      return;
    }

    startSpinSequence(nextRoster);
  };

  useEffect(() => {
    if (!open) {
      clearPending();
      setSessionRoster([]);
      setRollingStudent(null);
      setSelectedStudent(null);
      setLastResult(null);
      setSpinning(false);
      setPhase(0);
      return undefined;
    }

    setSessionRoster(roster);
    setRollingStudent(roster[0] || null);
    setSelectedStudent(null);
    setLastResult(null);
    setSpinning(false);
    setPhase(0);

    const syncVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setVoiceList([]);
        return;
      }

      setVoiceList(window.speechSynthesis.getVoices() || []);
    };

    syncVoices();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', syncVoices);
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        clearPending();
        setSpinning(false);
        onCloseRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearPending();
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', syncVoices);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || spinning) return;
    setSessionRoster(roster);
    if (!selectedStudent) {
      setRollingStudent(roster[0] || null);
    }
  }, [open, roster, selectedStudent, spinning]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
          onClick={() => {
            clearPending();
            setSpinning(false);
            onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={SPRING_MODAL}
            className="w-full max-w-[1160px] rounded-[38px] border border-white/50 bg-[linear-gradient(180deg,#fff9f3_0%,#edf7ff_100%)] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
            data-testid="random-picker-modal"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm">
                  <span>随机点名</span>
                </div>
                <h3 className="mt-4 text-3xl font-black text-slate-800">看看今天轮到谁。</h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearPending();
                  setSpinning(false);
                  onClose?.();
                }}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm transition hover:bg-slate-50"
              >
                关闭
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-cyan-100 px-3 py-1.5 text-cyan-700 shadow-sm">
                {currentClassName || '当前班级'}
              </span>
              <span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-700 shadow-sm">
                名单 {displayRoster.length}
              </span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_320px]">
              <div className="rounded-[30px] border border-white/70 bg-white/86 p-5 shadow-sm">
                <div className="relative mx-auto flex min-h-[500px] max-w-[620px] items-center justify-center overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_top,#fffdf8_0%,rgba(255,255,255,0.96)_34%,rgba(231,244,255,0.96)_100%)]">
                  <motion.div
                    className="pointer-events-none absolute h-[360px] w-[360px] rounded-full border border-cyan-100/80"
                    animate={{ rotate: spinning ? 360 : 0 }}
                    transition={{ duration: spinning ? 8 : 0, repeat: spinning ? Infinity : 0, ease: 'linear' }}
                  />
                  <div className="pointer-events-none absolute h-[290px] w-[290px] rounded-full border border-violet-100/80" />
                  <div className="pointer-events-none absolute h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,#fffef8_0%,rgba(255,245,210,0.92)_36%,rgba(255,255,255,0.1)_100%)] blur-md" />
                  <div className="pointer-events-none absolute inset-[14%] rounded-full border border-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]" />

                  {sphereChips.map((chip) => (
                    <div
                      key={chip.student.id}
                      className="pointer-events-none absolute left-1/2 top-1/2"
                      style={{
                        zIndex: chip.zIndex,
                        transform: `translate(calc(-50% + ${chip.x}px), calc(-50% + ${chip.y}px)) scale(${chip.scale})`,
                        opacity: chip.opacity
                      }}
                    >
                      <div
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-black shadow-sm transition-all ${
                          chip.isWinner
                            ? 'bg-slate-900 text-white'
                            : chip.isActive
                              ? 'bg-cyan-500 text-white'
                              : 'bg-white/90 text-slate-600'
                        }`}
                      >
                        {chip.student.name}
                      </div>
                    </div>
                  ))}

                  <motion.div
                    animate={spinning
                      ? { rotate: [0, 5, -5, 0], scale: [1, 1.03, 0.99, 1.02, 1] }
                      : { rotate: [0, 2, -2, 0], scale: [1, 1.01, 1] }}
                    transition={{ duration: spinning ? 1.4 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative z-20 flex h-[210px] w-[210px] flex-col items-center justify-center rounded-full border border-white/90 bg-[radial-gradient(circle_at_top,#ffffff_0%,#fff3d1_32%,#edf7ff_100%)] text-center shadow-[0_30px_80px_rgba(56,189,248,0.2)]"
                  >
                    <div className="absolute inset-3 rounded-full border border-white/70" />
                    <div className="text-6xl">{activeStudent?.avatar || '🎯'}</div>
                    <div className="mt-4 text-[11px] font-black tracking-[0.18em] text-slate-400">
                      {spinning ? '正在点名' : resultStudent ? '本次点名' : '准备开始'}
                    </div>
                    <div className="mt-2 max-w-[180px] text-2xl font-black leading-8 text-slate-800" data-testid="random-picker-name">
                      {activeStudent?.name || '等待开始'}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      {resultStudent ? '请这位同学准备回答' : '点一下就开始滚动'}
                    </div>
                  </motion.div>

                  <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/86 px-4 py-2 text-xs font-black text-slate-500 shadow-sm">
                    {spinning ? '点名进行中' : resultStudent ? '点名完成' : '等待开始'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className="rounded-[28px] border border-white/70 px-4 py-4 shadow-sm"
                  data-testid="random-picker-result"
                  style={{
                    background: selectedStudent
                      ? 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(254,240,138,0.62) 100%)'
                      : 'linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(224,242,254,0.72) 100%)'
                  }}
                >
                  <div className="text-sm font-black text-slate-800">
                    {resultStudent ? '本次点名结果' : '结果会显示在这里'}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-2xl shadow-sm">
                      {resultStudent?.avatar || activeStudent?.avatar || '🎯'}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xl font-black text-slate-800">
                        {resultStudent?.name || activeStudent?.name || '等待开始'}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {resultStudent ? '会自动播报名字' : '开始点名后自动更新'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/70 bg-white/86 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-800">当前名单</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">只从本班学员里点名</div>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white shadow-sm">
                      {displayRoster.length} 人
                    </span>
                  </div>

                  <div className="mt-4 max-h-[328px] space-y-2 overflow-auto pr-1" data-testid="random-picker-roster">
                    {displayRoster.length === 0 ? (
                      <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                        当前班级还没有学员。
                      </div>
                    ) : (
                      displayRoster.map((student) => {
                        const isActive = activeStudent?.id === student.id;
                        const isWinner = !spinning && resultStudent?.id === student.id;

                        return (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 shadow-sm transition ${
                              isWinner ? 'bg-amber-50 ring-2 ring-amber-200' : isActive ? 'bg-cyan-50 ring-2 ring-cyan-200' : 'bg-slate-50/90'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                                {student.avatar}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-slate-800">{student.name}</div>
                                <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">
                                  {student.team_name || '当前班级学员'}
                                </div>
                              </div>
                            </div>

                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ${
                              isWinner
                                ? 'bg-amber-400 text-white'
                                : isActive
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-white text-slate-500'
                            }`}>
                              {isWinner ? '已点到' : isActive ? (spinning ? '滚动中' : '当前') : '待抽取'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-500">
                每次结束后都可以直接再来一次。
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearPending();
                    setSpinning(false);
                    onClose?.();
                  }}
                  className="rounded-full bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5"
                >
                  关闭
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={spinning || displayRoster.length === 0}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300"
                  data-testid="random-picker-start"
                >
                  {spinning ? '点名中...' : resultStudent ? '再来一次' : '开始点名'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
