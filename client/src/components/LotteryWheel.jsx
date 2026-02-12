import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/sounds';

export default function LotteryWheel({ items, type, onClose, onResult, onStartPunishment }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [slots, setSlots] = useState([0, 0, 0]);
  const [showResult, setShowResult] = useState(false);
  const spinInterval = useRef(null);

  const startSpin = () => {
    if (isSpinning || items.length === 0) return;
    
    setIsSpinning(true);
    setResult(null);
    setShowResult(false);

    soundManager.playSpinStart();

    const resultIndex = Math.floor(Math.random() * items.length);
    const resultItem = items[resultIndex];

    let count = 0;
    const maxCount = 30;
    
    spinInterval.current = setInterval(() => {
      count++;
      
      setSlots([
        Math.floor(Math.random() * items.length),
        Math.floor(Math.random() * items.length),
        Math.floor(Math.random() * items.length),
      ]);
      
      soundManager.playSpinTick();

      if (count >= maxCount) {
        clearInterval(spinInterval.current);
        
        setSlots([resultIndex, resultIndex, resultIndex]);
        setResult(resultItem);
        setIsSpinning(false);
        
        setTimeout(() => {
          setShowResult(true);
          
          if (type === 'reward') {
            soundManager.playVictory();
            const duration = 3000;
            const end = Date.now() + duration;
            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#6BCB77', '#A66CFF'];
            
            (function frame() {
              confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
              });
              confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
              });
              if (Date.now() < end) requestAnimationFrame(frame);
            }());
          } else {
            soundManager.playPunishment();
          }
          
          if (onResult) onResult(resultItem);
        }, 500);
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (spinInterval.current) clearInterval(spinInterval.current);
    };
  }, []);

  const bgGradient = type === 'reward' 
    ? 'from-amber-600 via-orange-500 to-yellow-400'
    : 'from-purple-900 via-indigo-800 to-blue-900';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bgGradient}`}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: -50,
              rotate: 0,
              opacity: 0.6
            }}
            animate={{ 
              y: window.innerHeight + 50,
              rotate: 360,
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'linear'
            }}
          >
            {type === 'reward' ? ['⭐', '🌟', '✨', '💫', '🎁'][i % 5] : ['👻', '😈', '🎭', '🔥', '💀'][i % 5]}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4">
        {/* 标题 */}
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-7xl font-black text-center text-white mb-8 drop-shadow-lg"
          style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.3)' }}
        >
          {type === 'reward' ? '🎁 幸运大抽奖 🎁' : '😈 惩罚大转盘 😈'}
        </motion.h1>

        {/* 老虎机显示区 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-6 md:p-8 shadow-2xl border-8 border-yellow-400"
        >
          {/* 老虎机窗口 */}
          <div className="flex justify-center gap-3 md:gap-4 mb-6">
            {slots.map((slotIndex, i) => (
              <motion.div
                key={i}
                animate={isSpinning ? { y: [0, -20, 0] } : {}}
                transition={{ duration: 0.1, repeat: isSpinning ? Infinity : 0 }}
                className="w-24 h-32 md:w-40 md:h-48 bg-white rounded-xl flex items-center justify-center shadow-inner border-4 border-gray-300 overflow-hidden"
              >
                <motion.div
                  key={`${i}-${slotIndex}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center p-2"
                >
                  <div className="text-5xl md:text-7xl mb-1">
                    {items[slotIndex]?.icon || '❓'}
                  </div>
                  <div className="text-xs font-bold text-gray-700 truncate max-w-full leading-tight">
                    {items[slotIndex]?.name || '???'}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* 开始按钮 */}
          {!showResult && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startSpin}
              disabled={isSpinning}
              className={`w-full py-5 rounded-2xl text-2xl md:text-3xl font-black text-white transition-all ${
                isSpinning
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 shadow-lg'
              }`}
              style={{ boxShadow: isSpinning ? 'none' : '0 6px 0 #991B1B' }}
            >
              {isSpinning ? (
                <span className="flex items-center justify-center gap-3">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    🎰
                  </motion.span>
                  抽奖中...
                </span>
              ) : (
                '🎯 开始抽奖！'
              )}
            </motion.button>
          )}
        </motion.div>

        {/* 结果展示 */}
        <AnimatePresence>
          {showResult && result && (
            <motion.div
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: 50 }}
              className="mt-6"
            >
              <div className={`rounded-3xl p-6 md:p-8 text-center ${
                type === 'reward'
                  ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400'
                  : 'bg-gradient-to-r from-purple-600 via-pink-500 to-red-500'
              }`}>
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 0.5, repeat: 3 }}
                  className="text-7xl md:text-8xl mb-4"
                >
                  {result.icon}
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 drop-shadow-lg">
                  {result.name}
                </h2>
                <p className="text-lg md:text-xl text-white/90 mb-6">
                  {result.description}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {type === 'punishment' && onStartPunishment && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onStartPunishment(result)}
                      className="px-8 py-4 bg-white text-purple-600 rounded-2xl text-xl font-bold shadow-lg"
                    >
                      🎬 开始惩罚表演！
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="px-8 py-4 bg-white/20 text-white rounded-2xl text-xl font-bold"
                  >
                    关闭
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 关闭按钮 */}
        {!showResult && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClose}
            className="absolute top-4 right-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full text-white text-2xl font-bold"
          >
            ✕
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
