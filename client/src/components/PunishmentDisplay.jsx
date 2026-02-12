import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../utils/sounds';

// 舞蹈惩罚视频配置
const DANCE_VIDEOS = {
  penguin: { video: '/videos/penguin_dance.mp4', title: '企鹅摇' },
  kemu3: { video: '/videos/kemu3_dance.mp4', title: '科目三' },
  headshake: { video: '/videos/headshake_dance.mp4', title: '甩头舞' },
  robot: { video: '/videos/robot_dance.mp4', title: '机器人舞' },
  seaweed: { video: '/videos/seaweed_dance.mp4', title: '海草舞' },
};

// 配音视频列表
const DUBBING_VIDEOS = [
  { id: 1, name: '搞笑动物', file: 'funny_animals.mp4', thumbnail: '🐱' },
  { id: 2, name: '电影片段', file: 'movie_clip.mp4', thumbnail: '🎬' },
  { id: 3, name: '动画场景', file: 'cartoon_scene.mp4', thumbnail: '🎨' },
  { id: 4, name: '新闻播报', file: 'news_clip.mp4', thumbnail: '📺' },
  { id: 5, name: '广告片段', file: 'ad_clip.mp4', thumbnail: '📢' },
];

// 表情包数据
const EMOJI_EXPRESSIONS = [
  { emoji: '😂', name: '笑哭' }, { emoji: '🤣', name: '笑翻' }, { emoji: '😭', name: '大哭' },
  { emoji: '😱', name: '惊恐' }, { emoji: '🤯', name: '爆炸' }, { emoji: '😤', name: '生气' },
  { emoji: '🥺', name: '可怜' }, { emoji: '😏', name: '得意' }, { emoji: '🤪', name: '疯狂' },
  { emoji: '😵', name: '晕倒' }, { emoji: '🤮', name: '呕吐' }, { emoji: '😍', name: '花痴' },
  { emoji: '🥴', name: '醉了' }, { emoji: '😎', name: '酷' }, { emoji: '🤡', name: '小丑' },
  { emoji: '👻', name: '鬼脸' }, { emoji: '🤓', name: '书呆子' }, { emoji: '😈', name: '小恶魔' },
];

// 绕口令数据
const TONGUE_TWISTERS = [
  { id: 1, title: '四和十', content: '四是四，十是十，十四是十四，四十是四十。' },
  { id: 2, title: '吃葡萄', content: '吃葡萄不吐葡萄皮，不吃葡萄倒吐葡萄皮。' },
  { id: 3, title: '黑化肥', content: '黑化肥发灰，灰化肥发黑，黑化肥发灰会挥发。' },
  { id: 4, title: '八百标兵', content: '八百标兵奔北坡，炮兵并排北边跑。' },
  { id: 5, title: '红鲤鱼', content: '红鲤鱼与绿鲤鱼与驴，红鲤鱼与绿鲤鱼与驴。' },
  { id: 6, title: '牛郎恋刘娘', content: '牛郎恋刘娘，刘娘念牛郎，牛郎年年念刘娘。' },
];

// 成语数据
const IDIOMS = [
  { idiom: '手舞足蹈', hint: '非常高兴的样子' },
  { idiom: '抓耳挠腮', hint: '着急或思考的样子' },
  { idiom: '东张西望', hint: '到处看' },
  { idiom: '摇头晃脑', hint: '自得其乐的样子' },
  { idiom: '捧腹大笑', hint: '笑得很厉害' },
  { idiom: '垂头丧气', hint: '很沮丧的样子' },
  { idiom: '眉飞色舞', hint: '非常得意' },
  { idiom: '张牙舞爪', hint: '凶猛的样子' },
  { idiom: '蹑手蹑脚', hint: '轻轻走路' },
  { idiom: '指手画脚', hint: '指挥别人' },
];


// 倒计时组件
function Countdown({ onComplete }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }
    soundManager.playCountdown();
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <motion.div key={count} initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="text-center">
      <div className="text-white text-4xl mb-8">🎬 惩罚即将开始 🎬</div>
      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.5 }} className="text-[180px] font-black text-white" style={{ textShadow: '0 0 60px rgba(255,255,255,0.8)' }}>
        {count || '🎬'}
      </motion.div>
    </motion.div>
  );
}

// 舞蹈惩罚展示 - 视频有声音，更大的显示区域
function DancePunishment({ punishment, onClose }) {
  const config = DANCE_VIDEOS[punishment.animation_type] || DANCE_VIDEOS.penguin;
  const [timeLeft, setTimeLeft] = useState(20);
  const [mediaError, setMediaError] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl font-black text-white mb-2 text-center" style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.3)' }}>
        {punishment.icon} {punishment.name} {punishment.icon}
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg text-white/80 mb-4 text-center">{punishment.description}</motion.p>

      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-4xl">
        <div className="absolute -inset-3 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-3xl blur-xl opacity-75 animate-pulse" />
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/30">
          {!mediaError ? (
            <video ref={videoRef} src={config.video} className="w-full aspect-video object-contain bg-black" autoPlay loop playsInline onError={() => setMediaError(true)} />
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-purple-600 to-pink-600 flex flex-col items-center justify-center">
              <motion.div animate={{ rotate: [0, -15, 15, -15, 15, 0], y: [0, -20, 0, -20, 0] }} transition={{ duration: 1, repeat: Infinity }} className="text-[100px]">{punishment.icon}</motion.div>
              <p className="text-white text-xl mt-4">跟着节奏动起来！</p>
            </div>
          )}
          <div className="absolute top-4 right-4 bg-black/70 px-4 py-2 rounded-full">
            <span className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</span>
          </div>
        </div>
      </motion.div>

      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: Infinity }} className="mt-4 text-3xl md:text-4xl">🎵 跟着视频动起来！🎵</motion.div>
      <div className="w-full max-w-md mt-3">
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 20, ease: 'linear' }} className="h-full bg-gradient-to-r from-green-400 to-cyan-400" />
        </div>
      </div>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="mt-4 px-10 py-4 bg-white text-purple-600 rounded-2xl text-xl font-bold shadow-lg">✅ 完成惩罚</motion.button>
    </div>
  );
}


// 表情包挑战 - 随机3个表情
function EmojiChallenge({ punishment, onClose }) {
  const [emojis, setEmojis] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const shuffled = [...EMOJI_EXPRESSIONS].sort(() => Math.random() - 0.5);
    setEmojis(shuffled.slice(0, 3));
  }, []);

  const nextEmoji = () => {
    if (currentIndex < 2) setCurrentIndex(currentIndex + 1);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl font-black text-white mb-4 text-center">🤪 表情包模仿挑战 🤪</motion.h1>
      <p className="text-xl text-white/80 mb-6">模仿下面的表情，越夸张越好！</p>

      <div className="flex gap-4 mb-6">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-8 h-8 rounded-full ${i <= currentIndex ? 'bg-green-400' : 'bg-white/30'}`} />
        ))}
      </div>

      {emojis.length > 0 && (
        <motion.div key={currentIndex} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="bg-white/20 rounded-3xl p-8 text-center">
          <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity }} className="text-[150px] md:text-[200px]">
            {emojis[currentIndex]?.emoji}
          </motion.div>
          <div className="text-3xl text-white font-bold mt-4">第 {currentIndex + 1} 个：{emojis[currentIndex]?.name}</div>
        </motion.div>
      )}

      <div className="flex gap-4 mt-8">
        {currentIndex < 2 ? (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={nextEmoji} className="px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl text-xl font-bold">
            下一个表情 →
          </motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="px-10 py-4 bg-white text-green-600 rounded-2xl text-xl font-bold">
            🎉 挑战完成！
          </motion.button>
        )}
      </div>
    </div>
  );
}

// 绕口令挑战
function TongueTwisterChallenge({ punishment, onClose }) {
  const [selected, setSelected] = useState(null);
  const [showContent, setShowContent] = useState(false);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl font-black text-white mb-4 text-center">👅 绕口令挑战 👅</motion.h1>

      {!selected ? (
        <>
          <p className="text-xl text-white/80 mb-6">选择一个绕口令挑战自己！</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
            {TONGUE_TWISTERS.map(tt => (
              <motion.button key={tt.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelected(tt)} className="bg-white/20 hover:bg-white/30 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">📜</div>
                <div className="text-white font-bold text-lg">{tt.title}</div>
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl text-center">
          <div className="bg-white/20 rounded-3xl p-8 mb-6">
            <h2 className="text-3xl text-white font-bold mb-4">《{selected.title}》</h2>
            {showContent ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl md:text-3xl text-yellow-300 font-bold leading-relaxed">{selected.content}</motion.p>
            ) : (
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowContent(true)} className="px-8 py-4 bg-yellow-400 text-gray-800 rounded-xl text-xl font-bold">
                👀 点击显示内容
              </motion.button>
            )}
          </div>
          <p className="text-white/80 text-lg mb-6">快速、清晰地读出来，不能卡壳！</p>
          <div className="flex gap-4 justify-center">
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setSelected(null); setShowContent(false); }} className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold">🔄 换一个</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="px-8 py-3 bg-white text-purple-600 rounded-xl font-bold">✅ 完成</motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}


// 成语表演挑战
function IdiomChallenge({ punishment, onClose }) {
  const [idiom, setIdiom] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const random = IDIOMS[Math.floor(Math.random() * IDIOMS.length)];
    setIdiom(random);
  }, []);

  useEffect(() => {
    if (!revealed) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [revealed]);

  const getNewIdiom = () => {
    const random = IDIOMS[Math.floor(Math.random() * IDIOMS.length)];
    setIdiom(random);
    setRevealed(false);
    setTimeLeft(30);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl font-black text-white mb-4 text-center">🎭 成语表演 🎭</motion.h1>
      <p className="text-xl text-white/80 mb-6">用肢体语言表演成语，让大家猜！</p>

      {idiom && (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white/20 rounded-3xl p-8 text-center max-w-lg">
          {!revealed ? (
            <>
              <div className="text-6xl mb-4">🤫</div>
              <p className="text-white text-xl mb-6">只有表演者能看答案哦！</p>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setRevealed(true)} className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-xl font-bold">
                👁️ 查看成语（仅表演者）
              </motion.button>
            </>
          ) : (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl md:text-6xl text-yellow-300 font-black mb-4">{idiom.idiom}</motion.div>
              <p className="text-white/80 text-lg mb-4">提示：{idiom.hint}</p>
              <div className="text-3xl font-bold text-white mb-4">⏱️ {timeLeft}秒</div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-6">
                <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 30, ease: 'linear' }} className="h-full bg-gradient-to-r from-yellow-400 to-red-500" />
              </div>
            </>
          )}
        </motion.div>
      )}

      <div className="flex gap-4 mt-8">
        <motion.button whileHover={{ scale: 1.05 }} onClick={getNewIdiom} className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold">🔄 换一个</motion.button>
        <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="px-8 py-3 bg-white text-purple-600 rounded-xl font-bold">✅ 完成</motion.button>
      </div>
    </div>
  );
}

// 配音惩罚
function DubbingPunishment({ punishment, onClose }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoError, setVideoError] = useState(false);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl font-black text-white mb-4 text-center">🎬 配音挑战 🎬</motion.h1>
      <p className="text-xl text-white/80 mb-6">{punishment.description}</p>

      {!selectedVideo ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-3xl">
          <h2 className="text-2xl text-white text-center mb-6">👇 选择一个视频进行配音 👇</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {DUBBING_VIDEOS.map(video => (
              <motion.button key={video.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedVideo(video)} className="bg-white/20 hover:bg-white/30 rounded-2xl p-6 text-center">
                <div className="text-5xl mb-3">{video.thumbnail}</div>
                <div className="text-white font-bold">{video.name}</div>
              </motion.button>
            ))}
          </div>
          <p className="text-white/60 text-center mt-6 text-sm">💡 视频文件需放在 public/videos/ 目录</p>
        </motion.div>
      ) : (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-4xl">
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
            {!videoError ? (
              <video src={`/videos/${selectedVideo.file}`} className="w-full aspect-video" controls autoPlay muted onError={() => setVideoError(true)} />
            ) : (
              <div className="w-full aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">{selectedVideo.thumbnail}</div>
                <p className="text-white text-xl">视频未找到</p>
                <p className="text-white/60 text-sm mt-2">请下载 {selectedVideo.file} 到 videos 目录</p>
              </div>
            )}
            <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full font-bold animate-pulse">🔇 视频已静音 - 你来配音！</div>
          </div>
          <div className="flex justify-center gap-4 mt-6">
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setSelectedVideo(null); setVideoError(false); }} className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold">🔄 换一个</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold">✅ 完成</motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}


// 憋笑挑战
function LaughChallenge({ punishment, onClose }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [currentJoke, setCurrentJoke] = useState(0);
  const funnyContent = [
    { emoji: '🤪', text: '做一个最丑的鬼脸！' },
    { emoji: '🐔', text: '学鸡叫三声！' },
    { emoji: '🦆', text: '学鸭子走路！' },
    { emoji: '😜', text: '用鼻子写自己的名字！' },
    { emoji: '🙃', text: '倒着说"我不会笑"！' },
    { emoji: '🤡', text: '表演超级夸张的打喷嚏！' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    const jokeTimer = setInterval(() => { setCurrentJoke(prev => (prev + 1) % funnyContent.length); }, 3000);
    return () => { clearInterval(timer); clearInterval(jokeTimer); };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl font-black text-white mb-4 text-center">😐 憋笑挑战 😐</motion.h1>
      <motion.div key={timeLeft} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className={`text-[100px] md:text-[140px] font-black mb-4 ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>{timeLeft}</motion.div>
      <p className="text-2xl text-white/80 mb-6">坚持住！不许笑！</p>
      <motion.div key={currentJoke} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="bg-white/20 rounded-3xl p-8 text-center max-w-md">
        <div className="text-7xl mb-4">{funnyContent[currentJoke].emoji}</div>
        <div className="text-xl text-white font-bold">{funnyContent[currentJoke].text}</div>
      </motion.div>
      <div className="w-full max-w-md mt-6">
        <div className="h-4 bg-white/20 rounded-full overflow-hidden">
          <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 15, ease: 'linear' }} className="h-full bg-gradient-to-r from-yellow-400 to-red-500" />
        </div>
      </div>
      {timeLeft === 0 ? (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-6 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <div className="text-2xl text-white font-bold mb-4">挑战完成！</div>
          <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="px-10 py-4 bg-white text-green-600 rounded-2xl text-xl font-bold">✅ 完成</motion.button>
        </motion.div>
      ) : (
        <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="mt-6 px-10 py-4 bg-red-500 text-white rounded-2xl text-xl font-bold">😂 我笑了！认输！</motion.button>
      )}
    </div>
  );
}

// 定格挑战
function FreezeChallenge({ punishment, onClose }) {
  const [phase, setPhase] = useState('prepare');
  const [timeLeft, setTimeLeft] = useState(10);
  const poses = ['🦸 超级英雄姿势', '🤖 机器人定格', '🐒 猴子挠头', '💃 舞蹈定格', '🏃 跑步姿势', '🤸 瑜伽姿势'];
  const [pose] = useState(poses[Math.floor(Math.random() * poses.length)]);

  useEffect(() => {
    if (phase !== 'freeze') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); setPhase('done'); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 className="text-3xl md:text-5xl font-black text-white mb-4 text-center">🗿 定格挑战 🗿</motion.h1>
      {phase === 'prepare' && (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-2xl text-white mb-4">你的姿势是：</p>
          <div className="text-3xl text-yellow-300 font-bold mb-8">{pose}</div>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setPhase('freeze')} className="px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl text-xl font-bold">准备好了！开始定格！</motion.button>
        </motion.div>
      )}
      {phase === 'freeze' && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-[120px] mb-4">🗿</motion.div>
          <div className="text-6xl font-black text-white mb-4">{timeLeft}</div>
          <p className="text-2xl text-yellow-300">保持不动！！！</p>
          <div className="w-64 h-4 bg-white/20 rounded-full overflow-hidden mt-6">
            <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 10, ease: 'linear' }} className="h-full bg-gradient-to-r from-green-400 to-red-500" />
          </div>
        </motion.div>
      )}
      {phase === 'done' && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-8xl mb-4">🎉</div>
          <div className="text-3xl text-white font-bold mb-6">太棒了！挑战成功！</div>
          <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="px-10 py-4 bg-white text-green-600 rounded-2xl text-xl font-bold">✅ 完成</motion.button>
        </motion.div>
      )}
    </div>
  );
}


// 慢动作挑战
function SlowMotionChallenge({ punishment, onClose }) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const actions = ['🏃 跑步', '🥤 喝水', '👋 挥手', '🤝 握手', '📱 打电话'];
  const [action] = useState(actions[Math.floor(Math.random() * actions.length)]);

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [started]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 className="text-3xl md:text-5xl font-black text-white mb-4 text-center">🐌 慢动作挑战 🐌</motion.h1>
      {!started ? (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
          <motion.div animate={{ x: [-20, 20, -20] }} transition={{ duration: 3, repeat: Infinity }} className="text-8xl mb-6">🐌</motion.div>
          <p className="text-2xl text-white mb-4">用超级慢动作表演：</p>
          <div className="text-4xl text-yellow-300 font-bold mb-8">{action}</div>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setStarted(true)} className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl text-xl font-bold">🎬 开始表演</motion.button>
        </motion.div>
      ) : (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-4xl text-yellow-300 font-bold mb-4">{action}</div>
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-[100px] mb-4">🐌</motion.div>
          <div className="text-6xl font-black text-white mb-4">{timeLeft}s</div>
          <p className="text-xl text-white/80 mb-4">越慢越好！像放慢镜头一样！</p>
          {timeLeft === 0 ? (
            <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="px-10 py-4 bg-white text-green-600 rounded-2xl text-xl font-bold">🎉 完成！</motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="px-8 py-3 bg-white/20 text-white rounded-xl font-bold">跳过</motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// 动物叫声挑战
function AnimalSoundChallenge({ punishment, onClose }) {
  const [animals, setAnimals] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const allAnimals = [
    { emoji: '🐱', name: '猫咪', sound: '喵~' }, { emoji: '🐶', name: '小狗', sound: '汪汪!' },
    { emoji: '🐔', name: '公鸡', sound: '喔喔喔~' }, { emoji: '🐷', name: '小猪', sound: '哼哼~' },
    { emoji: '🐮', name: '奶牛', sound: '哞~' }, { emoji: '🦆', name: '鸭子', sound: '嘎嘎!' },
    { emoji: '🐸', name: '青蛙', sound: '呱呱!' }, { emoji: '🦁', name: '狮子', sound: '吼~' },
    { emoji: '🐺', name: '狼', sound: '嗷呜~' }, { emoji: '🐵', name: '猴子', sound: '吱吱!' },
  ];

  useEffect(() => {
    const shuffled = [...allAnimals].sort(() => Math.random() - 0.5);
    setAnimals(shuffled.slice(0, 3));
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h1 className="text-3xl md:text-5xl font-black text-white mb-4 text-center">🐱 动物叫声挑战 🐱</motion.h1>
      <p className="text-xl text-white/80 mb-6">模仿下面动物的叫声！</p>
      <div className="flex gap-4 mb-6">
        {[0, 1, 2].map(i => (<div key={i} className={`w-8 h-8 rounded-full ${i <= currentIndex ? 'bg-green-400' : 'bg-white/30'}`} />))}
      </div>
      {animals.length > 0 && (
        <motion.div key={currentIndex} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="bg-white/20 rounded-3xl p-8 text-center">
          <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-[120px]">{animals[currentIndex]?.emoji}</motion.div>
          <div className="text-3xl text-white font-bold mt-4">{animals[currentIndex]?.name}</div>
          <div className="text-2xl text-yellow-300 mt-2">"{animals[currentIndex]?.sound}"</div>
        </motion.div>
      )}
      <div className="flex gap-4 mt-8">
        {currentIndex < 2 ? (
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCurrentIndex(currentIndex + 1)} className="px-10 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl text-xl font-bold">下一个动物 →</motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.05 }} onClick={onClose} className="px-10 py-4 bg-white text-green-600 rounded-2xl text-xl font-bold">🎉 挑战完成！</motion.button>
        )}
      </div>
    </div>
  );
}


// 通用挑战展示
function ChallengePunishment({ punishment, onClose }) {
  const typeConfig = {
    truth: { title: '真心话', icon: '💭', bg: 'from-pink-600 via-rose-500 to-red-500', emoji: '🤔' },
    dare: { title: '大冒险', icon: '🎭', bg: 'from-purple-600 via-indigo-500 to-blue-500', emoji: '😱' },
    challenge: { title: '趣味挑战', icon: '🎯', bg: 'from-cyan-600 via-teal-500 to-green-500', emoji: '💪' },
  };
  const config = typeConfig[punishment.type] || typeConfig.challenge;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.div initial={{ rotateY: 180, scale: 0.5 }} animate={{ rotateY: 0, scale: 1 }} transition={{ duration: 0.8, type: 'spring' }} className={`w-full max-w-xl bg-gradient-to-br ${config.bg} rounded-3xl p-8 shadow-2xl`}>
        <div className="text-center mb-4">
          <span className="inline-block px-6 py-2 bg-white/20 rounded-full text-white text-lg font-bold">{config.icon} {config.title}</span>
        </div>
        <div className="text-center">
          <div className="text-7xl mb-4">{punishment.icon}</div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{punishment.name}</h2>
          <p className="text-xl text-white/90">{punishment.description}</p>
        </div>
        <motion.div animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl text-center mt-6">{config.emoji}</motion.div>
      </motion.div>
      <motion.button initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} whileHover={{ scale: 1.05 }} onClick={onClose} className="mt-8 px-12 py-4 bg-white text-gray-800 rounded-2xl text-xl font-bold shadow-lg">✅ 完成惩罚</motion.button>
    </div>
  );
}

// 主组件
export default function PunishmentDisplay({ punishment, onClose }) {
  const [phase, setPhase] = useState('countdown');

  const handleCountdownComplete = () => {
    setPhase('display');
    soundManager.playPunishmentStart();
  };

  const renderContent = () => {
    // 舞蹈类
    if (punishment.type === 'dance') {
      return <DancePunishment punishment={punishment} onClose={onClose} />;
    }
    // 表情包挑战
    if (punishment.name.includes('表情包')) {
      return <EmojiChallenge punishment={punishment} onClose={onClose} />;
    }
    // 绕口令
    if (punishment.name.includes('绕口令')) {
      return <TongueTwisterChallenge punishment={punishment} onClose={onClose} />;
    }
    // 成语表演
    if (punishment.name.includes('成语')) {
      return <IdiomChallenge punishment={punishment} onClose={onClose} />;
    }
    // 配音
    if (punishment.name.includes('配音')) {
      return <DubbingPunishment punishment={punishment} onClose={onClose} />;
    }
    // 憋笑挑战
    if (punishment.name.includes('憋笑')) {
      return <LaughChallenge punishment={punishment} onClose={onClose} />;
    }
    // 定格挑战
    if (punishment.name.includes('定格')) {
      return <FreezeChallenge punishment={punishment} onClose={onClose} />;
    }
    // 慢动作
    if (punishment.name.includes('慢动作')) {
      return <SlowMotionChallenge punishment={punishment} onClose={onClose} />;
    }
    // 动物叫
    if (punishment.name.includes('动物叫')) {
      return <AnimalSoundChallenge punishment={punishment} onClose={onClose} />;
    }
    // 通用
    return <ChallengePunishment punishment={punishment} onClose={onClose} />;
  };

  const bgGradient = punishment.type === 'dance' ? 'from-purple-900 via-pink-800 to-red-900'
    : punishment.type === 'truth' ? 'from-pink-900 via-rose-800 to-red-900'
    : punishment.type === 'dare' ? 'from-indigo-900 via-purple-800 to-pink-900'
    : 'from-cyan-900 via-teal-800 to-green-900';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-50 bg-gradient-to-br ${bgGradient} overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div key={i} className="absolute w-2 h-2 bg-white rounded-full" initial={{ x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), y: -20, opacity: 0.5 }} animate={{ y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20 }} transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} />
        ))}
      </div>
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === 'countdown' ? (
            <Countdown key="countdown" onComplete={handleCountdownComplete} />
          ) : (
            <motion.div key="content" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full">{renderContent()}</motion.div>
          )}
        </AnimatePresence>
      </div>
      <button onClick={onClose} className="absolute top-4 right-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full text-white text-2xl font-bold z-20">✕</button>
    </motion.div>
  );
}