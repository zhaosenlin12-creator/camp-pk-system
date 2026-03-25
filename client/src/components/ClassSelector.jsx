import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { soundManager } from '../utils/sounds';
import DangerConfirmModal from './DangerConfirmModal';

export default function ClassSelector({ showCreate = false }) {
  const { classes, currentClass, setCurrentClass, createClass, deleteClass, isAdmin } = useStore();
  const containerRef = useRef(null);
  const canManageClasses = Boolean(isAdmin && showCreate);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [pendingDeleteClass, setPendingDeleteClass] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const filteredClasses = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return classes;

    return classes.filter((classItem) =>
      String(classItem?.name || '').toLowerCase().includes(keyword)
    );
  }, [classes, searchValue]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;

    setSearchValue('');
    setCreateError('');
  }, [open]);

  const handleToggle = () => {
    soundManager.playClick();
    setOpen((value) => !value);
  };

  const handleSelect = async (classItem) => {
    soundManager.playClick();
    await setCurrentClass(classItem);
    setOpen(false);
  };

  const handleCreate = async (event) => {
    event?.preventDefault();

    const name = newClassName.trim();
    if (!name) {
      setCreateError('请输入班级名称');
      return;
    }

    setCreateBusy(true);
    const createdClass = await createClass(name);
    setCreateBusy(false);

    if (createdClass) {
      soundManager.playScoreUp();
      setNewClassName('');
      setCreateError('');
      setOpen(false);
      return;
    }

    setCreateError('创建班级失败，请稍后重试');
  };

  const handleDeleteRequest = (event, classItem) => {
    event.stopPropagation();
    soundManager.playClick();
    setDeleteError('');
    setPendingDeleteClass(classItem);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteClass) return;

    setDeleteBusy(true);
    const success = await deleteClass(pendingDeleteClass.id);
    setDeleteBusy(false);

    if (success) {
      setPendingDeleteClass(null);
      setDeleteError('');
      return;
    }

    setDeleteError('删除班级失败，请稍后重试。');
  };

  const selectedClassName = currentClass?.name || (classes.length ? '请选择班级' : '先创建班级');
  const helperText = currentClass
    ? `当前已同步到「${currentClass.name}」`
    : canManageClasses
      ? '搜索、创建并切换班级'
      : '搜索并选择要展示的班级';

  return (
    <>
      <div ref={containerRef} className="relative w-full max-w-4xl">
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.995 }}
          onClick={handleToggle}
          className="w-full rounded-[28px] border border-white/60 bg-white/18 px-4 py-3 text-left shadow-[0_22px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl transition hover:bg-white/24"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white text-cyan-500 shadow-sm">
                <Sparkles size={20} strokeWidth={2.6} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">Class Hub</div>
                <div className="truncate text-lg font-black text-white md:text-xl">{selectedClassName}</div>
                <div className="mt-0.5 truncate text-xs font-bold text-white/75">{helperText}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-full bg-white/16 px-3 py-2 text-xs font-black text-white/85">
                {classes.length} 个班级
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/16 text-white">
                <ChevronDown
                  size={20}
                  strokeWidth={2.6}
                  className={`transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </div>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 top-[calc(100%+12px)] z-[70] overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(245,251,255,0.96)_56%,rgba(250,245,255,0.94)_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
            >
              <div className="p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[240px] flex-1">
                    <Search
                      size={18}
                      strokeWidth={2.5}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="搜索班级名称"
                      className="w-full rounded-[22px] border border-slate-200 bg-white px-12 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                    />
                    {searchValue && (
                      <button
                        type="button"
                        onClick={() => setSearchValue('')}
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="清空班级搜索"
                      >
                        <X size={16} strokeWidth={2.6} />
                      </button>
                    )}
                  </div>

                  <div className="rounded-full bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-600">
                    展示页和后台共用同一班级
                  </div>
                </div>

                <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {filteredClasses.length > 0 ? (
                    filteredClasses.map((classItem) => {
                      const isSelected = Number(currentClass?.id) === Number(classItem.id);

                      return (
                        <motion.button
                          key={classItem.id}
                          type="button"
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.995 }}
                          onClick={() => void handleSelect(classItem)}
                          className={`flex w-full items-center justify-between gap-3 rounded-[24px] border px-4 py-3 text-left transition ${
                            isSelected
                              ? 'border-cyan-300 bg-cyan-50 shadow-[0_12px_28px_rgba(34,211,238,0.14)]'
                              : 'border-slate-100 bg-white/92 hover:border-cyan-200 hover:bg-cyan-50/60'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-sm font-black ${
                                isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-cyan-600'
                              }`}
                            >
                              班
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-base font-black text-slate-800">{classItem.name}</div>
                              <div className="mt-1 text-xs font-bold text-slate-400">
                                {isSelected ? '当前管理和展示都使用这个班级' : '点击切换到这个班级'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <div className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-white">
                                <Check size={14} strokeWidth={3} />
                                已选中
                              </div>
                            )}

                            {canManageClasses && (
                              <button
                                type="button"
                                onClick={(event) => handleDeleteRequest(event, classItem)}
                                data-testid={`class-delete-${classItem.id}`}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100 hover:text-rose-600"
                                aria-label={`删除班级 ${classItem.name}`}
                              >
                                <Trash2 size={16} strokeWidth={2.6} />
                              </button>
                            )}
                          </div>
                        </motion.button>
                      );
                    })
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <div className="text-lg font-black text-slate-700">没有找到匹配的班级</div>
                      <div className="mt-2 text-sm text-slate-500">
                        {canManageClasses ? '可以直接在下方新建一个班级。' : '换个关键词试试。'}
                      </div>
                    </div>
                  )}
                </div>

                {canManageClasses && (
                  <form
                    onSubmit={handleCreate}
                    className="mt-4 rounded-[26px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(240,253,244,0.95),rgba(255,255,255,0.98))] px-4 py-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-emerald-500 text-white shadow-sm">
                        <Plus size={20} strokeWidth={2.8} />
                      </div>

                      <div className="min-w-[220px] flex-1">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">Create</div>
                        <input
                          type="text"
                          value={newClassName}
                          onChange={(event) => {
                            setNewClassName(event.target.value);
                            if (createError) {
                              setCreateError('');
                            }
                          }}
                          placeholder="输入新班级名称"
                          className="mt-2 w-full rounded-[18px] border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={createBusy}
                        className="rounded-full bg-[linear-gradient(135deg,#34d399_0%,#10b981_100%)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(16,185,129,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {createBusy ? '创建中...' : '新建班级'}
                      </button>
                    </div>

                    {createError && (
                      <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-500">
                        {createError}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DangerConfirmModal
        open={Boolean(pendingDeleteClass)}
        title="删除整个班级？"
        description="这是最高风险的清理操作。班级本身以及这个班级下面的学员、战队、宠物成长、评分记录、报告和奖状都会被一起移除。"
        subjectLabel={pendingDeleteClass?.name || ''}
        impacts={[
          '班级会从班级选择区立即消失。',
          '该班级下的学员、战队、评分、报告、奖状和宠物相关数据会一起清理。',
          '这是不可撤回的操作，请确认不是误点。'
        ]}
        errorMessage={deleteError}
        busy={deleteBusy}
        confirmLabel="确认删除班级"
        cancelLabel="先保留"
        testId="danger-confirm-class"
        onCancel={() => {
          if (deleteBusy) return;
          setPendingDeleteClass(null);
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
