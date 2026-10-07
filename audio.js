class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.isPlayingMusic = false;
    this.step = 0;
    this.tempo = 145; // BPM
    this.beatPulse = 0; // 0..1 visual bounce synced to music!
    this.starMode = false;
    this.themeIndex = 0;
    this.timerId = null;

    // Joyful Mario-inspired bouncy melodies (MIDI note numbers, 0 = rest)
    this.melodies = [
      // Theme 0: Sunny Meadow (C major bouncy ragtime-pop)
      [
        76, 76, 0, 76, 0, 72, 76, 0,
        79, 0, 0, 0, 67, 0, 0, 0,
        72, 0, 0, 67, 0, 0, 64, 0,
        0, 69, 0, 71, 0, 70, 69, 0,
        67, 76, 79, 81, 0, 77, 79, 0,
        76, 0, 72, 74, 71, 0, 0, 0,
        72, 0, 0, 67, 0, 0, 64, 0,
        69, 71, 72, 74, 76, 79, 84, 0
      ],
      // Theme 1: Sky Carnival (F major / G major uplifting athletic)
      [
        72, 76, 79, 84, 0, 81, 79, 0,
        77, 81, 84, 86, 0, 84, 81, 0,
        79, 83, 86, 88, 0, 86, 84, 79,
        81, 0, 79, 0, 76, 0, 72, 0,
        74, 77, 81, 86, 0, 84, 81, 0,
        76, 79, 84, 88, 0, 86, 84, 0,
        89, 88, 86, 84, 83, 81, 79, 77,
        76, 79, 84, 0, 84, 0, 0, 0
      ],
      // Theme 2: Starlight Fiesta (Upbeat synth festival)
      [
        79, 0, 79, 84, 0, 83, 79, 0,
        76, 79, 81, 84, 0, 86, 84, 0,
        88, 0, 86, 84, 0, 81, 79, 0,
        77, 79, 81, 83, 84, 86, 88, 0,
        89, 0, 88, 84, 0, 81, 79, 0,
        76, 79, 84, 88, 0, 86, 84, 0,
        83, 84, 86, 88, 89, 91, 93, 95,
        96, 0, 84, 0, 96, 0, 0, 0
      ]
    ];

    this.basslines = [
      [
        48, 0, 55, 0, 60, 0, 55, 0,
        43, 0, 50, 0, 55, 0, 50, 0,
        48, 0, 55, 0, 52, 0, 55, 0,
        45, 0, 52, 0, 53, 0, 55, 0,
        48, 0, 55, 0, 53, 0, 57, 0,
        48, 0, 52, 0, 43, 0, 50, 0,
        48, 0, 52, 0, 45, 0, 52, 0,
        53, 0, 55, 0, 48, 0, 48, 0
      ]
    ];

    this.starMelody = [
      77, 77, 77, 0, 77, 77, 0, 77,
      76, 76, 76, 0, 76, 76, 0, 76
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  toggleMusic() {
    this.init();
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    } else {
      this.startMusic(this.themeIndex);
    }
    return this.enabled;
  }

  startMusic(themeIndex = 0) {
    this.init();
    this.themeIndex = themeIndex % this.melodies.length;
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.step = 0;
    this.scheduleNextStep();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  scheduleNextStep() {
    if (!this.isPlayingMusic || !this.enabled) return;

    const currentBpm = this.starMode ? 185 : this.tempo;
    const stepDurationMs = (60 / currentBpm / 2) * 1000; // 8th notes

    this.playStep(this.step, stepDurationMs / 1000);
    if (this.step % 2 === 0) {
      this.beatPulse = 1.0; // Trigger visual dance on quarter notes!
    }

    this.step = (this.step + 1) % 64;
    this.timerId = setTimeout(() => this.scheduleNextStep(), stepDurationMs);
  }

  playStep(step, dur) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    const melody = this.starMode
      ? this.starMelody[step % this.starMelody.length]
      : this.melodies[this.themeIndex][step % 64];

    const bass = this.basslines[0][step % 64];

    // Lead synth (Square + Triangle layer for warm joyful sound)
    if (melody > 0) {
      this.playTone(this.midiToFreq(melody), 'square', dur * 0.75, 0.055, now);
      this.playTone(this.midiToFreq(melody + 12), 'triangle', dur * 0.45, 0.025, now);
    }

    // Bass synth
    if (bass > 0) {
      this.playTone(this.midiToFreq(bass), 'triangle', dur * 0.85, 0.09, now);
    }

    // Light hi-hat percussion on off-beats
    if (step % 2 === 1) {
      this.playNoise(0.025, 0.02, now);
    }
  }

  playTone(freq, type, duration, gainVal, startTime = null) {
    if (!this.ctx || !this.enabled) return;
    const t = startTime || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  playNoise(duration, gainVal, startTime = null) {
    if (!this.ctx || !this.enabled) return;
    const t = startTime || this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  // --- Juicy SFX ---
  sfxJump(isBig = false) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    const startF = isBig ? 180 : 240;
    const endF = isBig ? 520 : 660;
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(endF, t + 0.16);
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  sfxSpring() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.28);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  sfxCoin() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    // Classic B5 -> E6 chime
    this.playTone(987.77, 'square', 0.08, 0.09, t);
    this.playTone(1318.51, 'square', 0.28, 0.09, t + 0.075);
  }

  sfxStomp(combo = 1) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const mult = Math.pow(1.12, Math.min(combo - 1, 7));
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 * mult, t);
    osc.frequency.exponentialRampToValueAtTime(140 * mult, t + 0.09);
    osc.frequency.exponentialRampToValueAtTime(580 * mult, t + 0.18);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  sfxBump() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playTone(150, 'triangle', 0.09, 0.15, t);
  }

  sfxBreak() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.15, 0.15, t);
    this.playTone(220, 'sawtooth', 0.12, 0.1, t);
    this.playTone(140, 'sawtooth', 0.15, 0.1, t + 0.05);
  }

  sfxPowerupAppear() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const notes = [330, 392, 659, 523, 587, 784];
    notes.forEach((f, idx) => {
      this.playTone(f, 'square', 0.06, 0.07, t + idx * 0.045);
    });
  }

  sfxPowerupCollect() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const notes = [330, 392, 659, 523, 587, 784, 659, 784, 1046.5];
    notes.forEach((f, idx) => {
      this.playTone(f, 'square', 0.08, 0.09, t + idx * 0.05);
    });
  }

  sfxFireball() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.1);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  sfxDamage() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const notes = [587, 523, 440, 349, 261];
    notes.forEach((f, i) => {
      this.playTone(f, 'sawtooth', 0.08, 0.1, t + i * 0.06);
    });
  }

  sfxVictory() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const fanfare = [
      { f: 523.25, d: 0.12, t: 0.0 },
      { f: 659.25, d: 0.12, t: 0.13 },
      { f: 783.99, d: 0.12, t: 0.26 },
      { f: 1046.5, d: 0.25, t: 0.39 },
      { f: 783.99, d: 0.14, t: 0.66 },
      { f: 1046.5, d: 0.55, t: 0.82 }
    ];
    fanfare.forEach(n => {
      this.playTone(n.f, 'square', n.d, 0.11, t + n.t);
      this.playTone(n.f * 0.5, 'triangle', n.d, 0.11, t + n.t);
    });
  }

  sfxFirework() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.22, 0.12, t);
    this.playTone(620 + Math.random() * 400, 'sine', 0.25, 0.08, t);
  }
}

window.sound = new SoundEngine();
