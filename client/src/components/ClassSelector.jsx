import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { soundManager } from '../utils/sounds';

export default function ClassSelector({ showCreate = false }) {
  const { classes, currentClass, setCurrentClass, createClass, deleteClass, isAdmin } = useStore();

  const handleSelect = (classItem) => {
    soundManager.playClick();
    setCurrentClass(classItem);
  };

  const handleCreate = async () => {
    const name = prompt('请输入班级名称：');
    if (name?.trim()) {
      await createClass(name.trim());
      soundManager.playScoreUp();
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (confirm('确定要删除这个班级吗？所有数据将被清除！')) {
      await deleteClass(id);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-center justify-center">
      {classes.map((c, index) => (
        <motion.button
          key={c.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => handleSelect(c)}
          className={`relative px-5 py-2.5 rounded-xl font-bold text-lg transition-all ${
            currentClass?.id === c.id
              ? 'bg-white text-orange-500 shadow-lg scale-105'
              : 'bg-white/30 text-white hover:bg-white/50'
          }`}
        >
          <span className="mr-1">📚</span>
          {c.name}
          {isAdmin && showCreate && (
            <span
              onClick={(e) => handleDelete(e, c.id)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 cursor-pointer"
            >
              ×
            </span>
          )}
        </motion.button>
      ))}
      
      {isAdmin && showCreate && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          className="btn-game btn-success"
        >
          <span className="mr-1">➕</span>
          新建班级
        </motion.button>
      )}

      {classes.length === 0 && !showCreate && (
        <p className="text-white/60">暂无班级，请在管理后台创建</p>
      )}
    </div>
  );
}
