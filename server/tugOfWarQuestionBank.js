const MIN_QUESTION_COUNT = 20;
const MAX_QUESTION_COUNT = 220;
const DEFAULT_QUESTION_COUNT = 20;

const SUBJECT_OPTIONS = [
  { value: 'chinese', label: '语文', group: '文化课' },
  { value: 'math', label: '数学', group: '文化课' },
  { value: 'english', label: '英语', group: '文化课' },
  { value: 'physics', label: '物理', group: '文化课' },
  { value: 'chemistry', label: '化学', group: '文化课' },
  { value: 'biology', label: '生物', group: '文化课' },
  { value: 'science', label: '科学', group: '文化课' },
  { value: 'history', label: '历史', group: '文化课' },
  { value: 'music', label: '音乐', group: '综合素养' },
  { value: 'sports', label: '体育', group: '综合素养' },
  { value: 'art', label: '美术', group: '综合素养' },
  { value: 'programming_python', label: 'Python', group: '编程/机器人' },
  { value: 'programming_scratch', label: 'Scratch', group: '编程/机器人' },
  { value: 'programming_wedo', label: 'WeDo', group: '编程/机器人' },
  { value: 'programming_jcode', label: 'JCode', group: '编程/机器人' },
  { value: 'robotics_lego_large', label: '乐高大颗粒', group: '编程/机器人' },
  { value: 'robotics_lego_small', label: '乐高小颗粒', group: '编程/机器人' },
  { value: 'robotics_general', label: '机器人通识', group: '编程/机器人' }
];

const GRADE_OPTIONS = [
  { value: 'k1', label: '幼儿园' },
  { value: 'g1', label: '一年级' },
  { value: 'g2', label: '二年级' },
  { value: 'g3', label: '三年级' },
  { value: 'g4', label: '四年级' },
  { value: 'g5', label: '五年级' },
  { value: 'g6', label: '六年级' },
  { value: 'g7', label: '初一' },
  { value: 'g8', label: '初二' },
  { value: 'g9', label: '初三' }
];

const QUESTION_TYPE_OPTIONS = [
  { value: 'quick_math', label: '口算快答' },
  { value: 'single_choice', label: '单选题（A/B/C/D）' },
  { value: 'multiple_choice', label: '多选题（可多选）' },
  { value: 'true_false', label: '判断题（对/错）' }
];

const QUICK_TEMPLATES = [
  {
    id: 'brain_teaser',
    label: '脑筋急转弯',
    description: '趣味脑筋急转弯，课堂热身可秒开。',
    subject: 'science',
    questionType: 'single_choice'
  },
  {
    id: 'math_oral',
    label: '数学口算',
    description: '高频口算题，适合 3 分钟抢答。',
    subject: 'math',
    questionType: 'quick_math'
  },
  {
    id: 'english_spelling',
    label: '英语单词拼写',
    description: '常见词汇拼写补全，反应快节奏。',
    subject: 'english',
    questionType: 'single_choice'
  },
  {
    id: 'science_facts',
    label: '科学常识',
    description: '科学通识题库，覆盖生活观察。',
    subject: 'science',
    questionType: 'single_choice'
  },
  {
    id: 'chinese_facts',
    label: '语文常识',
    description: '诗词、成语、文化常识抢答。',
    subject: 'chinese',
    questionType: 'single_choice'
  },
  {
    id: 'coding_basics',
    label: '编程与机器人基础',
    description: 'Python / Scratch / 机器人基础概念。',
    subject: 'programming_python',
    questionType: 'single_choice'
  }
];

const FACT_BANK = {
  science: [
    { prompt: '植物进行光合作用离不开哪种气体？', answer: '二氧化碳' },
    { prompt: '人呼吸最需要的气体是？', answer: '氧气' },
    { prompt: '地球围绕什么天体公转？', answer: '太阳' },
    { prompt: '水沸腾时常见温度是多少摄氏度？', answer: '100' },
    { prompt: '彩虹通常由几种颜色组成？', answer: '7' },
    { prompt: '昆虫通常有几条腿？', answer: '6' },
    { prompt: '磁铁最容易吸引哪类物质？', answer: '铁' },
    { prompt: '冰融化后会变成什么？', answer: '水' },
    { prompt: '人体最大的器官是？', answer: '皮肤' },
    { prompt: '植物根的主要作用之一是什么？', answer: '吸收水分' },
    { prompt: '一年四季的变化主要和什么有关？', answer: '地球公转' },
    { prompt: '月亮本身会发光吗？', answer: '不会' },
    { prompt: '声音在真空中能传播吗？', answer: '不能' },
    { prompt: '水常见的三种状态是？', answer: '固液气' },
    { prompt: '电灯发光通常依靠什么能量？', answer: '电能' },
    { prompt: '青蛙小时候生活在水里的形态叫？', answer: '蝌蚪' },
    { prompt: '地球表面大部分被什么覆盖？', answer: '水' },
    { prompt: '看到闪电后通常先看到还是先听到？', answer: '先看到闪电' },
    { prompt: '太阳看起来东升西落主要因为？', answer: '地球自转' },
    { prompt: '保护眼睛看书时要注意什么？', answer: '保持适当距离' }
  ],
  chinese: [
    { prompt: '“床前明月光”下一句是什么？', answer: '疑是地上霜' },
    { prompt: '“春眠不觉晓”下一句是什么？', answer: '处处闻啼鸟' },
    { prompt: '“少壮不努力”下一句是什么？', answer: '老大徒伤悲' },
    { prompt: '“三人行，必有我师”出自哪位思想家？', answer: '孔子' },
    { prompt: '“凿壁偷光”讲的是谁勤学？', answer: '匡衡' },
    { prompt: '“马到成功”通常用于祝福什么？', answer: '顺利成功' },
    { prompt: '“亡羊补牢”的“牢”原意是什么？', answer: '羊圈' },
    { prompt: '“画龙点睛”比喻做事最后什么最关键？', answer: '关键一笔' },
    { prompt: '“欲穷千里目”下一句是什么？', answer: '更上一层楼' },
    { prompt: '“谁知盘中餐”下一句是什么？', answer: '粒粒皆辛苦' },
    { prompt: '“遥知不是雪”下一句是什么？', answer: '为有暗香来' },
    { prompt: '“独在异乡为异客”下一句是什么？', answer: '每逢佳节倍思亲' },
    { prompt: '“但愿人长久”下一句是什么？', answer: '千里共婵娟' },
    { prompt: '“人有悲欢离合”下一句是什么？', answer: '月有阴晴圆缺' },
    { prompt: '“纸上得来终觉浅”下一句是什么？', answer: '绝知此事要躬行' },
    { prompt: '“一寸光阴一寸金”下一句是什么？', answer: '寸金难买寸光阴' },
    { prompt: '“闻鸡起舞”说的是谁勤奋学习？', answer: '祖逖' },
    { prompt: '“负荆请罪”里是谁向谁认错？', answer: '廉颇向蔺相如' },
    { prompt: '“狐假虎威”中的狐狸借的是谁的威风？', answer: '老虎' },
    { prompt: '“精卫”相传是哪位帝王的小女儿？', answer: '炎帝' }
  ],
  history: [
    { prompt: '郑和下西洋主要发生在哪个朝代？', answer: '明朝' },
    { prompt: '秦始皇统一后使用的文字被称为？', answer: '小篆' },
    { prompt: '中国第一个封建王朝是？', answer: '秦朝' },
    { prompt: '“丝绸之路”连接中国和哪两大洲？', answer: '亚洲和欧洲' },
    { prompt: '都江堰位于今天哪个省？', answer: '四川' },
    { prompt: '古代科举殿试第一名叫？', answer: '状元' },
    { prompt: '改进造纸术并广泛推广的人是？', answer: '蔡伦' },
    { prompt: '“贞观之治”与哪位皇帝有关？', answer: '唐太宗' },
    { prompt: '长城最早大规模连接于哪个朝代？', answer: '秦朝' },
    { prompt: '“开元盛世”出现在什么朝代？', answer: '唐朝' },
    { prompt: '北京故宫又叫做什么？', answer: '紫禁城' },
    { prompt: '《史记》的作者是谁？', answer: '司马迁' },
    { prompt: '岳飞是哪个朝代的名将？', answer: '南宋' },
    { prompt: '“卧薪尝胆”讲的是哪位君主？', answer: '勾践' },
    { prompt: '活字印刷术的发明者是谁？', answer: '毕昇' },
    { prompt: '清朝最后一位皇帝是谁？', answer: '溥仪' },
    { prompt: '《清明上河图》的作者是谁？', answer: '张择端' },
    { prompt: '辛亥革命发生于哪一年？', answer: '1911' },
    { prompt: '“玄武门之变”后即位的是谁？', answer: '李世民' },
    { prompt: '我国古代四大发明中用于指示方向的是？', answer: '指南针' }
  ],
  coding: [
    { prompt: 'Python 中用于输出到屏幕的函数是？', answer: 'print' },
    { prompt: '程序调试的主要目的是做什么？', answer: '查找并修复错误' },
    { prompt: '机器人常见输入设备之一是？', answer: '传感器' },
    { prompt: '顺序、分支、循环属于什么结构？', answer: '程序控制结构' },
    { prompt: 'Scratch 里角色移动常见积木关键词是？', answer: '移动' },
    { prompt: '变量定义时常见赋值符号是？', answer: '=' },
    { prompt: 'Python 中存放一组数据常用的结构之一是？', answer: '列表' },
    { prompt: 'if 语句主要用于实现什么？', answer: '条件判断' },
    { prompt: 'for 循环通常用来做什么？', answer: '重复执行' },
    { prompt: '把复杂任务拆成小步骤通常叫做什么？', answer: '任务分解' },
    { prompt: '流程图中的菱形通常表示什么？', answer: '判断' },
    { prompt: '机器人执行动作前通常需要先接收什么？', answer: '指令' },
    { prompt: 'Python 单行注释通常以什么开头？', answer: '#' },
    { prompt: 'Scratch 中让角色重复动作常用哪类积木？', answer: '重复' },
    { prompt: '传感器的核心作用是什么？', answer: '感知信息' },
    { prompt: '算法最重要的特点之一是什么？', answer: '步骤清晰' },
    { prompt: '程序运行中的错误通常叫什么？', answer: 'bug' },
    { prompt: 'Python 中判断两个值是否相等常用什么符号？', answer: '==' },
    { prompt: '机器人常见输出设备之一是？', answer: '电机' },
    { prompt: '编程前先画步骤图主要有助于什么？', answer: '理清思路' }
  ],
  teaser: [
    { prompt: '什么东西越洗越脏？', answer: '水' },
    { prompt: '什么门永远关不上？', answer: '球门' },
    { prompt: '什么瓜不能吃？', answer: '傻瓜' },
    { prompt: '什么东西明明是你的，别人却用得更多？', answer: '名字' },
    { prompt: '什么地方的路最窄？', answer: '冤家路窄' },
    { prompt: '什么东西倒立后会增加一半？', answer: '6' },
    { prompt: '什么车没有轮子？', answer: '风车' },
    { prompt: '什么字人人都会念错？', answer: '错' },
    { prompt: '什么桥下面没有水？', answer: '立交桥' },
    { prompt: '什么帽子不能戴？', answer: '螺帽' },
    { prompt: '什么布剪不断？', answer: '瀑布' },
    { prompt: '什么球离人最近？', answer: '眼球' },
    { prompt: '什么东西越分享越多？', answer: '快乐' },
    { prompt: '什么东西打破了大家反而高兴？', answer: '纪录' },
    { prompt: '什么东西看不见摸不着却能听见？', answer: '声音' },
    { prompt: '什么东西不能吃却总有人请吃？', answer: '吃亏' },
    { prompt: '什么动物最喜欢贴在墙上？', answer: '海豹' },
    { prompt: '什么虎不会咬人？', answer: '壁虎' },
    { prompt: '什么猫不抓老鼠？', answer: '熊猫' },
    { prompt: '什么东西有嘴却不会说话？', answer: '壶' }
  ],
  english: [
    { prompt: '补全单词：py__on', answer: 'python' },
    { prompt: '补全单词：scr_tch', answer: 'scratch' },
    { prompt: '补全单词：r_bot', answer: 'robot' },
    { prompt: '补全单词：sci_nce', answer: 'science' },
    { prompt: '补全单词：hist_ry', answer: 'history' },
    { prompt: '补全单词：engli_h', answer: 'english' },
    { prompt: '补全单词：compu_er', answer: 'computer' },
    { prompt: '补全单词：teach_r', answer: 'teacher' },
    { prompt: '补全单词：stude_t', answer: 'student' },
    { prompt: '补全单词：less_n', answer: 'lesson' },
    { prompt: '补全单词：keybo_rd', answer: 'keyboard' },
    { prompt: '补全单词：monit_r', answer: 'monitor' },
    { prompt: '补全单词：musi_', answer: 'music' },
    { prompt: '补全单词：spor_s', answer: 'sports' },
    { prompt: '补全单词：ener_y', answer: 'energy' },
    { prompt: '补全单词：progr_m', answer: 'program' },
    { prompt: '补全单词：clas_', answer: 'class' },
    { prompt: '补全单词：camp_s', answer: 'campus' },
    { prompt: '补全单词：anim_l', answer: 'animal' },
    { prompt: '补全单词：painti_g', answer: 'painting' }
  ]
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items = []) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizePromptKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？,.!?;:'"`]/g, '');
}

function clampQuestionCount(count) {
  const n = Number(count);
  if (!Number.isFinite(n)) return DEFAULT_QUESTION_COUNT;
  return Math.min(MAX_QUESTION_COUNT, Math.max(MIN_QUESTION_COUNT, Math.round(n)));
}

function getGradeLevel(grade) {
  const map = { k1: 0, g1: 1, g2: 2, g3: 3, g4: 4, g5: 5, g6: 6, g7: 7, g8: 8, g9: 9 };
  return map[grade] || 3;
}

function toNumericQuestion({ prompt, answer }, index, source = 'preset') {
  return {
    id: `${source}-${Date.now()}-${index + 1}-${Math.random().toString(16).slice(2, 8)}`,
    prompt: String(prompt || '').trim(),
    question_type: 'quick_math',
    answer_mode: 'numeric',
    answers: [String(answer || '').trim()],
    source,
    difficulty: 'normal'
  };
}

function toSingleChoiceQuestion({ prompt, correct, distractors = [] }, index, source = 'preset') {
  const optionsRaw = shuffle([correct, ...distractors.slice(0, 3)]);
  const keys = ['A', 'B', 'C', 'D'];
  const options = optionsRaw.map((text, idx) => ({ key: keys[idx], text: String(text) }));
  const correctOption = options.find((item) => item.text === correct);
  return {
    id: `${source}-${Date.now()}-${index + 1}-${Math.random().toString(16).slice(2, 8)}`,
    prompt: String(prompt || '').trim(),
    question_type: 'single_choice',
    answer_mode: 'single_choice',
    options,
    correct_options: [correctOption?.key || 'A'],
    source,
    difficulty: 'normal'
  };
}

function toTrueFalseQuestion({ prompt, answerTrue }, index, source = 'preset') {
  return {
    id: `${source}-${Date.now()}-${index + 1}-${Math.random().toString(16).slice(2, 8)}`,
    prompt: String(prompt || '').trim(),
    question_type: 'true_false',
    answer_mode: 'single_choice',
    options: [
      { key: 'T', text: '对' },
      { key: 'F', text: '错' }
    ],
    correct_options: [answerTrue ? 'T' : 'F'],
    source,
    difficulty: 'normal'
  };
}

function toMultiChoiceQuestion(item, index, source = 'preset') {
  return {
    id: `${source}-${Date.now()}-${index + 1}-${Math.random().toString(16).slice(2, 8)}`,
    prompt: String(item.prompt || '').trim(),
    question_type: 'multiple_choice',
    answer_mode: 'multiple_choice',
    options: item.options || [],
    correct_options: item.correct_options || [],
    source,
    difficulty: 'normal'
  };
}

function cycleFromBank(bank, count, builder, source = 'preset') {
  const deduped = [];
  const seen = new Set();

  shuffle(Array.isArray(bank) ? bank : []).forEach((item) => {
    const key = normalizePromptKey(item?.prompt);
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  if (!deduped.length) return [];
  const limit = Math.min(Math.max(0, Number(count) || 0), deduped.length);
  const result = [];
  for (let i = 0; i < limit; i += 1) {
    result.push(builder(deduped[i], i, source));
  }
  return result;
}

function buildMathQuestions(count, grade, questionType = 'quick_math') {
  const level = getGradeLevel(grade);
  const maxNum = level <= 2 ? 30 : level <= 4 ? 90 : level <= 6 ? 220 : 500;
  const operations = level <= 1 ? ['+', '-'] : ['+', '-', '*', '/'];
  const result = [];
  const seenPrompts = new Set();
  let attempts = 0;
  const maxAttempts = Math.max(count * 16, 60);

  while (result.length < count && attempts < maxAttempts) {
    attempts += 1;
    const op = operations[randomInt(0, operations.length - 1)];
    let a = randomInt(2, maxNum);
    let b = randomInt(2, Math.max(3, Math.floor(maxNum * 0.7)));
    let answer = 0;
    let prompt = '';

    if (op === '/') {
      const divisor = randomInt(2, Math.max(3, Math.floor(maxNum / 10)));
      const quotient = randomInt(2, 18);
      a = divisor * quotient;
      b = divisor;
      answer = quotient;
      prompt = `${a} ÷ ${b} = ?`;
    } else if (op === '*') {
      const left = randomInt(2, Math.min(25, Math.max(9, level * 3 + 6)));
      const right = randomInt(2, Math.min(15, Math.max(8, level * 2 + 5)));
      answer = left * right;
      prompt = `${left} × ${right} = ?`;
    } else if (op === '-') {
      if (a < b) [a, b] = [b, a];
      answer = a - b;
      prompt = `${a} - ${b} = ?`;
    } else {
      answer = a + b;
      prompt = `${a} + ${b} = ?`;
    }

    const promptKey = normalizePromptKey(prompt);
    if (!promptKey || seenPrompts.has(promptKey)) continue;
    seenPrompts.add(promptKey);

    if (questionType === 'single_choice') {
      const distractors = new Set();
      while (distractors.size < 3) {
        const delta = randomInt(1, Math.max(3, Math.ceil(answer * 0.25)));
        const candidate = randomInt(0, 1) === 0 ? answer + delta : Math.max(0, answer - delta);
        if (candidate !== answer) distractors.add(String(candidate));
      }
      result.push(toSingleChoiceQuestion({
        prompt,
        correct: String(answer),
        distractors: [...distractors]
      }, result.length));
    } else {
      result.push(toNumericQuestion({ prompt, answer: String(answer) }, result.length));
    }
  }

  return result;
}

function buildSingleChoiceFromFactBank(bank, count) {
  const answerPool = [...new Set(bank.map((item) => String(item.answer).trim()))];
  return cycleFromBank(bank, count, (item, index) => {
    const distractorPool = shuffle(answerPool.filter((text) => text !== item.answer));
    return toSingleChoiceQuestion({
      prompt: item.prompt,
      correct: item.answer,
      distractors: distractorPool.slice(0, 3)
    }, index);
  });
}

function buildTrueFalsePack(count) {
  const statements = [
    { prompt: '地球围绕太阳公转。', answerTrue: true },
    { prompt: '昆虫有 8 条腿。', answerTrue: false },
    { prompt: 'Python 是一种编程语言。', answerTrue: true },
    { prompt: '“床前明月光”出自《春晓》。', answerTrue: false },
    { prompt: '水在 0 摄氏度以下会结冰（常压下）。', answerTrue: true },
    { prompt: '篮球三分线外投篮得 2 分。', answerTrue: false },
    { prompt: '“凿壁偷光”是勤学故事。', answerTrue: true },
    { prompt: 'Scratch 只能画图，不能做交互。', answerTrue: false },
    { prompt: '月亮本身会发光。', answerTrue: false },
    { prompt: '青蛙小时候叫蝌蚪。', answerTrue: true },
    { prompt: '程序里的 bug 指的是一只真的虫子。', answerTrue: false },
    { prompt: '长城是中国古代重要建筑。', answerTrue: true },
    { prompt: '植物生长完全不需要阳光。', answerTrue: false },
    { prompt: '键盘通常属于输入设备。', answerTrue: true },
    { prompt: '都江堰位于四川。', answerTrue: true },
    { prompt: '海豚属于鱼类。', answerTrue: false },
    { prompt: '“但愿人长久”的下一句是“千里共婵娟”。', answerTrue: true },
    { prompt: '机器人接收指令后不能执行动作。', answerTrue: false },
    { prompt: '水蒸发后会变成水蒸气。', answerTrue: true },
    { prompt: '传感器的作用是感知信息。', answerTrue: true }
  ];
  return cycleFromBank(statements, count, (item, idx) => toTrueFalseQuestion(item, idx));
}

function buildMultiChoicePack(count) {
  const rows = [
    {
      prompt: '下面哪些属于程序控制结构？',
      options: [
        { key: 'A', text: '顺序' },
        { key: 'B', text: '分支' },
        { key: 'C', text: '循环' },
        { key: 'D', text: '颜色' }
      ],
      correct_options: ['A', 'B', 'C']
    },
    {
      prompt: '下列哪些是哺乳动物？',
      options: [
        { key: 'A', text: '鲸鱼' },
        { key: 'B', text: '海豚' },
        { key: 'C', text: '鲨鱼' },
        { key: 'D', text: '蝙蝠' }
      ],
      correct_options: ['A', 'B', 'D']
    },
    {
      prompt: '下列哪些是中国古代四大发明？',
      options: [
        { key: 'A', text: '造纸术' },
        { key: 'B', text: '指南针' },
        { key: 'C', text: '活字印刷术' },
        { key: 'D', text: '蒸汽机' }
      ],
      correct_options: ['A', 'B', 'C']
    },
    {
      prompt: '下面哪些属于 Python 常见数据类型？',
      options: [
        { key: 'A', text: '整数' },
        { key: 'B', text: '字符串' },
        { key: 'C', text: '列表' },
        { key: 'D', text: '彩虹' }
      ],
      correct_options: ['A', 'B', 'C']
    },
    {
      prompt: '下面哪些属于可再生能源？',
      options: [
        { key: 'A', text: '太阳能' },
        { key: 'B', text: '风能' },
        { key: 'C', text: '煤炭' },
        { key: 'D', text: '水能' }
      ],
      correct_options: ['A', 'B', 'D']
    },
    {
      prompt: '下面哪些句子出自《静夜思》？',
      options: [
        { key: 'A', text: '床前明月光' },
        { key: 'B', text: '疑是地上霜' },
        { key: 'C', text: '千里共婵娟' },
        { key: 'D', text: '举头望明月' }
      ],
      correct_options: ['A', 'B', 'D']
    },
    {
      prompt: '下面哪些属于常见输入设备？',
      options: [
        { key: 'A', text: '键盘' },
        { key: 'B', text: '鼠标' },
        { key: 'C', text: '麦克风' },
        { key: 'D', text: '显示器' }
      ],
      correct_options: ['A', 'B', 'C']
    },
    {
      prompt: '下面哪些做法有助于保护眼睛？',
      options: [
        { key: 'A', text: '读书坐端正' },
        { key: 'B', text: '看书离太近' },
        { key: 'C', text: '适当休息' },
        { key: 'D', text: '光线充足' }
      ],
      correct_options: ['A', 'C', 'D']
    },
    {
      prompt: '下面哪些属于固体？',
      options: [
        { key: 'A', text: '冰块' },
        { key: 'B', text: '石头' },
        { key: 'C', text: '牛奶' },
        { key: 'D', text: '木头' }
      ],
      correct_options: ['A', 'B', 'D']
    },
    {
      prompt: '下面哪些属于中国传统节日？',
      options: [
        { key: 'A', text: '春节' },
        { key: 'B', text: '端午节' },
        { key: 'C', text: '感恩节' },
        { key: 'D', text: '中秋节' }
      ],
      correct_options: ['A', 'B', 'D']
    },
    {
      prompt: '下面哪些积木常见于 Scratch 运动模块？',
      options: [
        { key: 'A', text: '移动 10 步' },
        { key: 'B', text: '旋转 15 度' },
        { key: 'C', text: '说你好' },
        { key: 'D', text: '面向 90 度方向' }
      ],
      correct_options: ['A', 'B', 'D']
    },
    {
      prompt: '下面哪些属于机器人常见输出设备？',
      options: [
        { key: 'A', text: '电机' },
        { key: 'B', text: '蜂鸣器' },
        { key: 'C', text: 'LED 灯' },
        { key: 'D', text: '温度传感器' }
      ],
      correct_options: ['A', 'B', 'C']
    },
    {
      prompt: '下面哪些是描述天气的词语？',
      options: [
        { key: 'A', text: '晴朗' },
        { key: 'B', text: '多云' },
        { key: 'C', text: '炎热' },
        { key: 'D', text: '香蕉' }
      ],
      correct_options: ['A', 'B', 'C']
    },
    {
      prompt: '下面哪些符号属于常见数学运算符？',
      options: [
        { key: 'A', text: '+' },
        { key: 'B', text: '-' },
        { key: 'C', text: '*' },
        { key: 'D', text: '/' }
      ],
      correct_options: ['A', 'B', 'C', 'D']
    },
    {
      prompt: '下面哪些动物会经历变态发育？',
      options: [
        { key: 'A', text: '青蛙' },
        { key: 'B', text: '蝴蝶' },
        { key: 'C', text: '小鸡' },
        { key: 'D', text: '蚕' }
      ],
      correct_options: ['A', 'B', 'D']
    },
    {
      prompt: '下面哪些属于安全用电做法？',
      options: [
        { key: 'A', text: '湿手碰插座' },
        { key: 'B', text: '不拉拽电线' },
        { key: 'C', text: '损坏插头及时更换' },
        { key: 'D', text: '雷雨天远离危险电器' }
      ],
      correct_options: ['B', 'C', 'D']
    },
    {
      prompt: '下面哪些属于中国古代名著？',
      options: [
        { key: 'A', text: '西游记' },
        { key: 'B', text: '红楼梦' },
        { key: 'C', text: '三国演义' },
        { key: 'D', text: '小王子' }
      ],
      correct_options: ['A', 'B', 'C']
    },
    {
      prompt: '下面哪些属于编程前的好习惯？',
      options: [
        { key: 'A', text: '先理清步骤' },
        { key: 'B', text: '不看需求直接写' },
        { key: 'C', text: '先画流程' },
        { key: 'D', text: '完成后测试' }
      ],
      correct_options: ['A', 'C', 'D']
    },
    {
      prompt: '下面哪些属于水的状态变化？',
      options: [
        { key: 'A', text: '融化' },
        { key: 'B', text: '蒸发' },
        { key: 'C', text: '凝固' },
        { key: 'D', text: '发芽' }
      ],
      correct_options: ['A', 'B', 'C']
    },
    {
      prompt: '下面哪些做法有助于团队合作？',
      options: [
        { key: 'A', text: '互相提醒' },
        { key: 'B', text: '分工合作' },
        { key: 'C', text: '抢话打断' },
        { key: 'D', text: '共同复盘' }
      ],
      correct_options: ['A', 'B', 'D']
    }
  ];
  return cycleFromBank(rows, count, (item, idx) => toMultiChoiceQuestion(item, idx));
}

function findTemplate(templateId) {
  return QUICK_TEMPLATES.find((item) => item.id === templateId) || null;
}

function pickSubjectBank(subject) {
  if (subject === 'chinese') return FACT_BANK.chinese;
  if (subject === 'history') return FACT_BANK.history;
  if (subject === 'science' || subject === 'physics' || subject === 'chemistry' || subject === 'biology') return FACT_BANK.science;
  if (subject === 'english') return FACT_BANK.english;
  if (subject === 'programming_python'
    || subject === 'programming_scratch'
    || subject === 'programming_wedo'
    || subject === 'programming_jcode'
    || subject === 'robotics_lego_large'
    || subject === 'robotics_lego_small'
    || subject === 'robotics_general') {
    return FACT_BANK.coding;
  }
  if (subject === 'music' || subject === 'sports' || subject === 'art') return FACT_BANK.science;
  return FACT_BANK.science;
}

function generatePresetQuestions({
  templateId,
  subject = 'math',
  grade = 'g3',
  questionType = 'single_choice',
  questionCount = DEFAULT_QUESTION_COUNT
} = {}) {
  const count = clampQuestionCount(questionCount);
  const template = findTemplate(templateId);
  const effectiveType = template?.questionType || questionType;

  if (template) {
    if (template.id === 'brain_teaser') {
      return buildSingleChoiceFromFactBank(FACT_BANK.teaser, count);
    }
    if (template.id === 'math_oral') return buildMathQuestions(count, grade, 'quick_math');
    if (template.id === 'english_spelling') {
      return buildSingleChoiceFromFactBank(FACT_BANK.english, count);
    }
    if (template.id === 'science_facts') return buildSingleChoiceFromFactBank(FACT_BANK.science, count);
    if (template.id === 'chinese_facts') return buildSingleChoiceFromFactBank(FACT_BANK.chinese, count);
    if (template.id === 'coding_basics') {
      return buildSingleChoiceFromFactBank(FACT_BANK.coding, count);
    }
  }

  if (subject === 'math') {
    if (effectiveType === 'single_choice') return buildMathQuestions(count, grade, 'single_choice');
    return buildMathQuestions(count, grade, 'quick_math');
  }

  if (effectiveType === 'true_false') return buildTrueFalsePack(count);
  if (effectiveType === 'multiple_choice') return buildMultiChoicePack(count);
  return buildSingleChoiceFromFactBank(pickSubjectBank(subject), count);
}

module.exports = {
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  DEFAULT_QUESTION_COUNT,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  QUICK_TEMPLATES,
  clampQuestionCount,
  findTemplate,
  generatePresetQuestions
};
