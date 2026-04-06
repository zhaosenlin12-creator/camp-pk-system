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

function getVoiceLabel(voices = []) {
  const preferredVoice = voices.find((voice) => /zh|Chinese|中文/i.test(`${voice.lang} ${voice.name}`));
  if (preferredVoice) return `语音播报已准备`;
  if (voices.length > 0) return '设备有语音，但未找到中文声线';
  return '当前设备不支持语音，会改用提示音';
}

function buildOrbitParticles(seedCount) {
  const total = Math.min(24, Math.max(16, seedCount * 4 || 16));
  return Array.from({ length: total }, (_, index) => {
    const angle = (Math.PI * 2 * index) / total;
    const radiusX = 112 + ((index % 4) * 12);
    const radiusY = 68 + ((index % 5) * 10);
    const size = 8 + (index % 3) * 4;
    const duration = 3.8 + (index % 5) * 0.35;
    const delay = index * 0.07;

    return {
      key: `particle-${index}`,
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
      size,
      duration,
      delay,
      opacity: 0.34 + (index % 4) * 0.12
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
  const [rollingStudent, setRollingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [voiceList, setVoiceList] = useState([]);
  const [voiceHint, setVoiceHint] = useState('点名结果会自动播报');
  const timeoutsRef = useRef([]);

  const roster = useMemo(() => normalizeRoster(students), [students]);
  const orbitParticles = useMemo(() => buildOrbitParticles(roster.length), [roster.length]);
  const activeStudent = selectedStudent || rollingStudent || roster[0] || null;

  const clearPending = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const announceStudent = (student) => {
    if (!student || typeof window === 'undefined' || !window.speechSynthesis) {
      setVoiceHint('当前设备不支持语音，会改用提示音');
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(`请 ${student.name} 准备回答`);
    const preferredVoice = voiceList.find((voice) => /zh|Chinese|中文/i.test(`${voice.lang} ${voice.name}`));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || 'zh-CN';
    } else {
      utterance.lang = 'zh-CN';
    }

    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setVoiceHint(preferredVoice ? '已播报点名结果' : '已尝试播报点名结果');
    } catch (error) {
      setVoiceHint('语音播报失败，已保留提示音');
    }
  };

  const handleStart = async () => {
    if (spinning) return;

    let nextRoster = roster;

    if (onRefresh) {
      try {
        const refreshedStudents = await onRefresh();
        const normalizedRefreshed = normalizeRoster(refreshedStudents);
        if (normalizedRefreshed.length > 0) {
          nextRoster = normalizedRefreshed;
        }
      } catch (error) {
        // Keep using the latest in-memory roster when refresh fails.
      }
    }

    if (nextRoster.length === 0) {
      setVoiceHint('当前班级还没有学员，先去添加名单');
      return;
    }

    clearPending();
    setSpinning(true);
    setSelectedStudent(null);
    setVoiceHint(getVoiceLabel(voiceList));
    setRollingStudent(nextRoster[0]);
    soundManager.playPickerStart();

    const finalIndex = Math.floor(Math.random() * nextRoster.length);
    const totalTicks = Math.max(18, Math.min(28, nextRoster.length * 5));
    const offset = finalIndex + Math.floor(Math.random() * Math.max(nextRoster.length, 1));

    let elapsed = 0;

    for (let index = 0; index < totalTicks; index += 1) {
      elapsed += 56 + index * 16;
      const student = nextRoster[(offset + index) % nextRoster.length];

      timeoutsRef.current.push(
        window.setTimeout(() => {
          soundManager.playPickerTick();
          startTransition(() => {
            setRollingStudent(student);
          });
        }, elapsed)
      );
    }

    const winner = nextRoster[finalIndex];

    timeoutsRef.current.push(
      window.setTimeout(() => {
        setSpinning(false);
        setSelectedStudent(winner);
        setRollingStudent(winner);
        soundManager.playPickerResult();
        announceStudent(winner);
      }, elapsed + 220)
    );
  };

  useEffect(() => {
    if (!open) {
      clearPending();
      setSelectedStudent(null);
      setRollingStudent(null);
      setSpinning(false);
      return undefined;
    }

    setSelectedStudent(null);
    setRollingStudent(null);

    const syncVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setVoiceList([]);
        setVoiceHint('当前设备不支持语音，会改用提示音');
        return;
      }

      const voices = window.speechSynthesis.getVoices() || [];
      setVoiceList(voices);
      setVoiceHint(getVoiceLabel(voices));
    };

    syncVoices();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', syncVoices);
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        clearPending();
        setSpinning(false);
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearPending();
      window.removeEventListener('keydown', onKeyDown);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', syncVoices);
      }
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || spinning || selectedStudent || rollingStudent || roster.length === 0) {
      return;
    }

    setRollingStudent(roster[0]);
  }, [open, roster, spinning, selectedStudent, rollingStudent]);

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
            className="w-full max-w-[1120px] rounded-[36px] border border-white/50 bg-[linear-gradient(180deg,#fff9f3_0%,#edf7ff_100%)] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
            data-testid="random-picker-modal"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm">
                  <span>随机点名</span>
                </div>
                <h3 className="mt-4 text-3xl font-black text-slate-800">点亮幸运球，看看轮到谁。</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  只会从当前班级名单里随机点名，结果会带提示音和语音播报。
                </p>
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
                名单 {roster.length}
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-slate-500 shadow-sm">
                {voiceHint}
              </span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_320px]">
              <div className="rounded-[30px] border border-white/70 bg-white/86 p-5 shadow-sm">
                <div className="relative mx-auto flex min-h-[440px] max-w-[560px] items-center justify-center overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top,#fffdf8_0%,rgba(255,255,255,0.95)_36%,rgba(230,244,255,0.95)_100%)]">
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/80" />
                    <div className="absolute left-1/2 top-1/2 h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-100/90" />
                    <div className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#ffffff_0%,rgba(255,255,255,0.55)_52%,rgba(255,255,255,0)_100%)] blur-xl" />
                  </div>

                  {orbitParticles.map((particle) => (
                    <motion.span
                      key={particle.key}
                      className="pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-white shadow-[0_10px_20px_rgba(56,189,248,0.24)]"
                      style={{
                        width: particle.size,
                        height: particle.size,
                        marginLeft: -(particle.size / 2),
                        marginTop: -(particle.size / 2),
                        opacity: particle.opacity
                      }}
                      animate={spinning
                        ? {
                            x: [particle.x, particle.x * 0.82, particle.x],
                            y: [particle.y, particle.y * 1.12, particle.y],
                            scale: [1, 1.25, 0.9, 1],
                            opacity: [particle.opacity, 0.92, particle.opacity]
                          }
                        : {
                            x: [particle.x, particle.x * 0.94, particle.x],
                            y: [particle.y, particle.y * 1.04, particle.y],
                            scale: [1, 1.08, 1]
                          }}
                      transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: particle.delay
                      }}
                    />
                  ))}

                  <motion.div
                    animate={spinning
                      ? { rotate: [0, 6, -6, 0], scale: [1, 1.03, 0.99, 1.02, 1] }
                      : { rotate: [0, 2, -2, 0], scale: [1, 1.01, 1] }}
                    transition={{ duration: spinning ? 1.35 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative z-10 flex h-[230px] w-[230px] flex-col items-center justify-center rounded-full border border-white/80 bg-[radial-gradient(circle_at_top,#ffffff_0%,#fff6dc_34%,#e3f3ff_100%)] text-center shadow-[0_30px_80px_rgba(56,189,248,0.22)]"
                  >
                    <div className="absolute inset-3 rounded-full border border-white/70" />
                    <div className="text-5xl">{activeStudent?.avatar || '🎯'}</div>
                    <div className="mt-4 text-[11px] font-black tracking-[0.2em] text-slate-400">
                      {spinning ? '正在点名' : selectedStudent ? '点名结果' : '准备开始'}
                    </div>
                    <div className="mt-2 max-w-[180px] text-2xl font-black leading-8 text-slate-800" data-testid="random-picker-name">
                      {activeStudent?.name || '等待名单'}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      {selectedStudent ? '请准备回答' : '开始后会自动滚动和播报'}
                    </div>
                  </motion.div>

                  <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/84 px-4 py-2 text-xs font-black text-slate-500 shadow-sm">
                    {spinning ? '粒子球加速中' : selectedStudent ? '点名完成' : '等待开始'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/70 bg-white/86 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-800">当前名单</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">只从本班学员里随机点名</div>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white shadow-sm">
                      {roster.length} 人
                    </span>
                  </div>

                  <div className="mt-4 max-h-[292px] space-y-2 overflow-auto pr-1" data-testid="random-picker-roster">
                    {roster.length === 0 ? (
                      <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                        当前班级还没有学员。
                      </div>
                    ) : (
                      roster.map((student) => {
                        const isActive = activeStudent?.id === student.id;

                        return (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 shadow-sm transition ${
                              isActive ? 'bg-cyan-50 ring-2 ring-cyan-200' : 'bg-slate-50/90'
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
                              isActive ? 'bg-cyan-500 text-white' : 'bg-white text-slate-500'
                            }`}>
                              {isActive ? (spinning ? '滚动中' : '当前') : '待抽取'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

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
                    {selectedStudent ? '本次点名结果' : '结果会显示在这里'}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-2xl shadow-sm">
                      {selectedStudent?.avatar || activeStudent?.avatar || '🎯'}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xl font-black text-slate-800">
                        {selectedStudent?.name || activeStudent?.name || '等待开始'}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {selectedStudent ? '请这位同学准备回答' : '开始点名后会自动更新'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-500">
                点名时会先滚动，再锁定结果，避免一闪而过。
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
                  disabled={spinning || roster.length === 0}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300"
                  data-testid="random-picker-start"
                >
                  {spinning ? '点名中...' : selectedStudent ? '再来一次' : '开始点名'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
