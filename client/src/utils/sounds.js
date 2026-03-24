// 音效管理器 - 使用Web Audio API
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.musicOscillator = null;
    this.musicGain = null;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 确保音频上下文是运行状态
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // 播放音符
  playNote(frequency, duration = 0.1, type = 'sine', volume = 0.3) {
    if (!this.enabled) return;
    this.init();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // 播放和弦
  playChord(frequencies, duration = 0.3, type = 'sine', volume = 0.15) {
    frequencies.forEach(freq => this.playNote(freq, duration, type, volume));
  }

  playSequence(notes, defaultType = 'sine', defaultVolume = 0.2, spacing = 90) {
    notes.forEach((note, index) => {
      const [frequency, duration = 0.12, type = defaultType, volume = defaultVolume] = note;
      setTimeout(() => this.playNote(frequency, duration, type, volume), index * spacing);
    });
  }

  // 加分音效 - 欢快上升
  playScoreUp() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.15, 'sine', 0.2), i * 80);
    });
  }

  // 扣分音效 - 下降
  playScoreDown() {
    const notes = [392, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.2, 'triangle', 0.2), i * 100);
    });
  }

  // 胜利音效 - 凯旋
  playVictory() {
    const melody = [
      { freq: 523, dur: 0.1 },
      { freq: 659, dur: 0.1 },
      { freq: 784, dur: 0.1 },
      { freq: 1047, dur: 0.2 },
      { freq: 784, dur: 0.1 },
      { freq: 1047, dur: 0.4 },
    ];
    let time = 0;
    melody.forEach(({ freq, dur }) => {
      setTimeout(() => this.playNote(freq, dur, 'sine', 0.25), time);
      time += dur * 600;
    });
    
    // 和弦结尾
    setTimeout(() => {
      this.playChord([523, 659, 784, 1047], 0.5, 'sine', 0.15);
    }, time);
  }

  // 抽奖开始音效
  playSpinStart() {
    if (!this.enabled) return;
    this.init();
    
    // 上升音阶
    const notes = [262, 330, 392, 523, 659, 784];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.1, 'square', 0.15), i * 50);
    });
  }

  // 抽奖转动音效
  playSpinTick() {
    this.playNote(600 + Math.random() * 400, 0.03, 'square', 0.1);
  }

  // 抽奖结果音效
  playSpinResult() {
    const notes = [523, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.2, 'sine', 0.2), i * 100);
    });
  }

  // 惩罚音效 - 搞笑下降
  playPunishment() {
    const notes = [400, 350, 300, 250, 200, 150];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.15, 'sawtooth', 0.15), i * 80);
    });
  }

  // 惩罚开始音效
  playPunishmentStart() {
    if (!this.enabled) return;
    this.init();
    
    // 戏剧性开场
    this.playChord([196, 247, 294], 0.3, 'sawtooth', 0.2);
    setTimeout(() => {
      this.playChord([220, 277, 330], 0.3, 'sawtooth', 0.2);
    }, 300);
    setTimeout(() => {
      this.playChord([262, 330, 392], 0.5, 'sawtooth', 0.25);
    }, 600);
  }

  // 倒计时音效
  playCountdown() {
    this.playNote(800, 0.15, 'sine', 0.3);
  }

  // 点击音效
  playClick() {
    this.playNote(600, 0.05, 'sine', 0.15);
  }

  playPetProfileOpen() {
    this.playSequence(
      [
        [659, 0.06, 'triangle', 0.1],
        [880, 0.08, 'sine', 0.12],
        [1047, 0.12, 'triangle', 0.12],
        [1319, 0.16, 'sine', 0.08]
      ],
      'sine',
      0.12,
      68
    );
  }

  playPetFeed() {
    this.playSequence(
      [
        [392, 0.08, 'triangle', 0.08],
        [523, 0.08, 'triangle', 0.1],
        [659, 0.12, 'sine', 0.12],
        [784, 0.14, 'sine', 0.1]
      ],
      'sine',
      0.1,
      62
    );

    setTimeout(() => {
      this.playChord([392, 523, 659], 0.2, 'triangle', 0.04);
    }, 140);
  }

  playPetPlay() {
    this.playSequence(
      [
        [523, 0.06, 'triangle', 0.08],
        [784, 0.06, 'triangle', 0.08],
        [659, 0.08, 'sine', 0.1],
        [988, 0.12, 'sine', 0.12],
        [1175, 0.14, 'triangle', 0.1]
      ],
      'sine',
      0.1,
      58
    );

    setTimeout(() => {
      this.playChord([659, 784, 988], 0.18, 'triangle', 0.04);
    }, 180);
  }

  playPetClean() {
    this.playSequence(
      [
        [784, 0.05, 'triangle', 0.08],
        [988, 0.05, 'triangle', 0.08],
        [1319, 0.08, 'sine', 0.1],
        [1568, 0.12, 'sine', 0.1]
      ],
      'sine',
      0.08,
      54
    );

    setTimeout(() => {
      this.playChord([988, 1319, 1760], 0.22, 'triangle', 0.04);
    }, 160);
  }

  playPetClaim() {
    this.playSequence(
      [
        [523, 0.08, 'triangle', 0.08],
        [659, 0.08, 'triangle', 0.1],
        [784, 0.12, 'sine', 0.14],
        [988, 0.14, 'sine', 0.16],
        [1319, 0.18, 'triangle', 0.14]
      ],
      'sine',
      0.12,
      74
    );

    setTimeout(() => {
      this.playChord([392, 523, 659], 0.24, 'triangle', 0.05);
    }, 120);

    setTimeout(() => {
      this.playChord([659, 784, 988, 1319], 0.38, 'sine', 0.06);
    }, 360);
  }

  playPetHatch() {
    this.playSequence(
      [
        [392, 0.08, 'triangle', 0.08],
        [523, 0.08, 'triangle', 0.12],
        [659, 0.1, 'sine', 0.15],
        [784, 0.12, 'sine', 0.18],
        [1047, 0.18, 'sine', 0.2],
        [1319, 0.24, 'triangle', 0.16],
        [1568, 0.24, 'sine', 0.12]
      ],
      'sine',
      0.16,
      78
    );

    setTimeout(() => {
      this.playChord([262, 392, 523], 0.22, 'triangle', 0.05);
    }, 140);

    setTimeout(() => {
      this.playChord([523, 659, 784, 1047], 0.36, 'sine', 0.07);
    }, 410);

    setTimeout(() => {
      this.playNote(1568, 0.22, 'triangle', 0.08);
    }, 560);

    setTimeout(() => {
      this.playChord([784, 1047, 1319], 0.3, 'sine', 0.05);
    }, 760);
  }

  playPetEvolve() {
    this.playSequence(
      [
        [330, 0.1, 'triangle', 0.1],
        [440, 0.1, 'triangle', 0.12],
        [659, 0.12, 'sine', 0.14],
        [880, 0.16, 'sawtooth', 0.14],
        [1175, 0.2, 'sine', 0.2],
        [1319, 0.26, 'triangle', 0.22],
        [1568, 0.32, 'sine', 0.18],
        [1760, 0.34, 'sine', 0.12]
      ],
      'sine',
      0.16,
      88
    );

    setTimeout(() => {
      this.playChord([220, 330, 440], 0.24, 'triangle', 0.06);
    }, 120);

    setTimeout(() => {
      this.playChord([523, 659, 880, 1319], 0.54, 'sine', 0.1);
    }, 520);

    setTimeout(() => {
      this.playChord([659, 988, 1319, 1760], 0.62, 'triangle', 0.08);
    }, 760);

    setTimeout(() => {
      this.playChord([784, 1175, 1568, 2093], 0.68, 'sine', 0.06);
    }, 1080);
  }

  playRankingHighlight() {
    this.playSequence(
      [
        [784, 0.08, 'sine', 0.1],
        [988, 0.08, 'sine', 0.1],
        [1175, 0.14, 'sine', 0.12]
      ],
      'sine',
      0.1,
      65
    );
  }

  // 播放舞蹈背景音乐（简单节拍）
  playDanceMusic() {
    if (!this.enabled) return;
    this.init();

    // 创建简单的节拍循环
    const playBeat = () => {
      if (!this.enabled) return;
      
      // 低音鼓
      this.playNote(80, 0.1, 'sine', 0.4);
      
      // 高音
      setTimeout(() => {
        this.playNote(400, 0.05, 'square', 0.1);
      }, 250);
      
      setTimeout(() => {
        this.playNote(80, 0.1, 'sine', 0.3);
      }, 500);
      
      setTimeout(() => {
        this.playNote(500, 0.05, 'square', 0.1);
      }, 750);
    };

    // 开始循环
    playBeat();
    this.musicInterval = setInterval(playBeat, 1000);
  }

  // 停止音乐
  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // 切换音效开关
  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    }
    return this.enabled;
  }
}

export const soundManager = new SoundManager();
