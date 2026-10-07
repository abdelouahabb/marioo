// ============================================================================
// SUPER MARIO JOY! 🌟 - Living 2D Platformer Engine
// ============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;  // 1024
const H = canvas.height; // 576
const TILE = 40;

// HUD Elements
const elScore = document.getElementById('hud-score');
const elCoins = document.getElementById('hud-coins');
const elWorld = document.getElementById('hud-world');
const elTime = document.getElementById('hud-time');
const elLives = document.getElementById('hud-lives');
const overlayScreen = document.getElementById('overlay-screen');
const victoryScreen = document.getElementById('victory-screen');
const victoryTitle = document.getElementById('victory-title');
const victoryStats = document.getElementById('victory-stats');
const btnPlay = document.getElementById('btn-play');
const btnNextLevel = document.getElementById('btn-next-level');
const btnMusic = document.getElementById('btn-music');
const btnRestart = document.getElementById('btn-restart');
const lvlButtons = document.querySelectorAll('.lvl-btn');

// Input State
const keys = {
  left: false,
  right: false,
  jump: false,
  jumpJustPressed: false,
  run: false,
  fireJustPressed: false,
  down: false
};

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (!keys.jump) keys.jumpJustPressed = true;
    keys.jump = true;
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX' || e.code === 'KeyJ') {
    if (!keys.run) keys.fireJustPressed = true;
    keys.run = true;
  }
  if (e.code === 'KeyM') {
    toggleMusicUI();
  }
  if (e.code === 'KeyR' && game.state === 'playing') {
    game.loadLevel(game.currentLevel);
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX' || e.code === 'KeyJ') keys.run = false;
});

function toggleMusicUI() {
  const on = window.sound.toggleMusic();
  btnMusic.textContent = on ? '🎵 ON' : '🔇 OFF';
}

btnMusic.addEventListener('click', () => {
  toggleMusicUI();
  btnMusic.blur();
});

btnRestart.addEventListener('click', () => {
  window.sound.init();
  game.loadLevel(game.currentLevel);
  btnRestart.blur();
});

lvlButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    lvlButtons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    game.selectedStartLevel = parseInt(btn.dataset.level, 10);
  });
});

btnPlay.addEventListener('click', () => {
  window.sound.init();
  overlayScreen.classList.remove('active');
  game.startNewGame(game.selectedStartLevel);
});

btnNextLevel.addEventListener('click', () => {
  victoryScreen.classList.remove('active');
  const next = (game.currentLevel + 1) % 3;
  game.loadLevel(next);
});

// ============================================================================
// HELPER UTILITIES
// ============================================================================
function aabb(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
}

// ============================================================================
// PARTICLES & FLOATING TEXT
// ============================================================================
class Particle {
  constructor(x, y, vx, vy, color, size, life, type = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.type = type; // 'circle', 'star', 'brick', 'confetti', 'dust'
    this.rot = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.25;
    this.gravity = type === 'dust' ? -0.04 : (type === 'brick' ? 0.45 : 0.18);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.rot += this.vRot;
    this.life--;
  }

  draw(ctx, camX) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x - camX, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;

    if (this.type === 'star') {
      drawStarShape(ctx, 0, 0, 5, this.size, this.size * 0.45);
      ctx.fill();
    } else if (this.type === 'brick') {
      ctx.strokeStyle = '#1f1b38';
      ctx.lineWidth = 2;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else if (this.type === 'confetti') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size * (this.type === 'dust' ? (1.4 - alpha * 0.5) : alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color = '#ffd93d') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 48;
    this.maxLife = 48;
  }

  update() {
    this.y -= 1.3;
    this.life--;
  }

  draw(ctx, camX) {
    const alpha = Math.max(0, this.life / this.maxLife);
    const scale = this.life > 38 ? 1.25 : 1.0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x - camX, this.y);
    ctx.scale(scale, scale);
    ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1f1b38';
    ctx.strokeText(this.text, 0, 0);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

function drawStarShape(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}

// ============================================================================
// PLAYER (MARIO)
// ============================================================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = 32;
    this.h = 38;
    this.facing = 1;
    this.power = 0; // 0 = small, 1 = Super (Big), 2 = Fire
    this.starTimer = 0;
    this.invincibleTimer = 0;

    // Platforming feel
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBuffer = 0;
    this.stompCombo = 0;
    this.groundPounding = false;

    // Squash & stretch animation
    this.scaleX = 1;
    this.scaleY = 1;
    this.walkCycle = 0;
    this.fireCooldown = 0;
    this.dead = false;
    this.reachingGoal = false;
  }

  setPower(newPower) {
    const oldH = this.h;
    this.power = newPower;
    this.h = this.power > 0 ? 52 : 38;
    this.y -= (this.h - oldH);
    this.scaleX = 1.35;
    this.scaleY = 0.7;
  }

  update(level) {
    if (this.dead) {
      this.vy += 0.45;
      this.y += this.vy;
      return;
    }

    if (this.reachingGoal) {
      this.updateGoalSequence(level);
      return;
    }

    // Timers
    if (this.invincibleTimer > 0) this.invincibleTimer--;
    if (this.fireCooldown > 0) this.fireCooldown--;
    if (this.starTimer > 0) {
      this.starTimer--;
      if (this.starTimer % 3 === 0) {
        const colors = ['#ff3b47', '#ffd93d', '#3ddc84', '#48dbfb', '#ff6bcb'];
        const c = colors[Math.floor(Math.random() * colors.length)];
        game.particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          c, 7, 22, 'star'
        ));
      }
      if (this.starTimer === 0) {
        window.sound.starMode = false;
      }
    }

    // Horizontal Movement
    const maxSpeed = keys.run ? 6.8 : 4.7;
    const accel = this.onGround ? 0.55 : 0.36;
    const friction = this.onGround ? 0.82 : 0.93;

    if (!this.groundPounding) {
      if (keys.left) {
        this.vx -= accel;
        this.facing = -1;
      } else if (keys.right) {
        this.vx += accel;
        this.facing = 1;
      } else {
        this.vx *= friction;
        if (Math.abs(this.vx) < 0.08) this.vx = 0;
      }
      this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
    } else {
      this.vx = 0;
    }

    // Running dust particles
    if (this.onGround && Math.abs(this.vx) > 3.5 && Math.random() < 0.35) {
      game.particles.push(new Particle(
        this.facing === 1 ? this.x : this.x + this.w,
        this.y + this.h - 4,
        -this.facing * (0.5 + Math.random()),
        -0.5,
        'rgba(255,255,255,0.85)',
        5, 18, 'dust'
      ));
    }

    // Coyote & Jump Buffer
    if (this.onGround) {
      this.coyoteTimer = 7;
      this.stompCombo = 0;
      this.groundPounding = false;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    if (keys.jumpJustPressed) {
      this.jumpBuffer = 8;
      keys.jumpJustPressed = false;
    } else if (this.jumpBuffer > 0) {
      this.jumpBuffer--;
    }

    // Execute Jump
    if (this.jumpBuffer > 0 && this.coyoteTimer > 0) {
      const speedBonus = Math.abs(this.vx) * 0.18;
      this.vy = -11.6 - speedBonus;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0;
      this.scaleX = 0.72;
      this.scaleY = 1.32;
      window.sound.sfxJump(this.power > 0);

      for (let i = 0; i < 6; i++) {
        game.particles.push(new Particle(
          this.x + this.w / 2,
          this.y + this.h,
          (Math.random() - 0.5) * 4,
          Math.random() * 1.5,
          '#ffffff', 5, 16, 'dust'
        ));
      }
    }

    // Variable Jump Height
    if (!keys.jump && this.vy < -4.2 && !this.groundPounding) {
      this.vy *= 0.65;
    }

    // Ground Pound in mid-air
    if (!this.onGround && keys.down && !this.groundPounding && this.vy > -3) {
      this.groundPounding = true;
      this.vy = 14;
      this.vx = 0;
      this.scaleX = 0.68;
      this.scaleY = 1.38;
    }

    // Fireball shooting
    if (keys.fireJustPressed) {
      keys.fireJustPressed = false;
      if (this.power === 2 && this.fireCooldown === 0) {
        this.shootFireball();
      }
    }

    // Gravity
    this.vy += this.groundPounding ? 0.9 : 0.52;
    if (this.vy > 15) this.vy = 15;

    // Move & Collide X
    this.x += this.vx;
    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    }
    this.resolveCollisionsX(level);

    // Move & Collide Y
    const wasOnGround = this.onGround;
    this.onGround = false;
    this.y += this.vy;
    this.resolveCollisionsY(level, wasOnGround);

    // Walk animation
    if (this.onGround) {
      this.walkCycle += Math.abs(this.vx) * 0.12;
      if (Math.abs(this.vx) < 0.2) this.walkCycle = 0;
    }

    // Recover Squash & Stretch smoothly
    this.scaleX = lerp(this.scaleX, 1, 0.22);
    this.scaleY = lerp(this.scaleY, 1, 0.22);

    // Pit fall check
    if (this.y > H + 120) {
      this.die();
    }
  }

  shootFireball() {
    this.fireCooldown = 18;
    window.sound.sfxFireball();
    this.scaleX = 1.2;
    this.scaleY = 0.85;
    game.fireballs.push({
      x: this.facing === 1 ? this.x + this.w + 2 : this.x - 14,
      y: this.y + this.h * 0.4,
      vx: this.facing * 8.5,
      vy: 2.5,
      w: 14,
      h: 14,
      bounces: 0
    });
  }

  resolveCollisionsX(level) {
    for (const b of level.blocks) {
      if (b.broken || b.hidden) continue;
      if (aabb(this, b)) {
        if (this.vx > 0) {
          this.x = b.x - this.w;
          this.vx = 0;
        } else if (this.vx < 0) {
          this.x = b.x + b.w;
          this.vx = 0;
        }
      }
    }
  }

  resolveCollisionsY(level, wasOnGround) {
    // Solid blocks
    for (const b of level.blocks) {
      if (b.broken) continue;
      if (b.hidden && this.vy >= 0) continue; // Hidden blocks only hit from below!

      if (aabb(this, b)) {
        if (this.vy > 0) {
          this.y = b.y - this.h;
          if (!wasOnGround && this.vy > 3) {
            this.scaleX = 1.28;
            this.scaleY = 0.75;
          }
          if (this.groundPounding) {
            game.screenShake = 8;
            window.sound.sfxBump();
            if (b.type === 'brick') {
              this.hitBlock(b, level, true);
            }
            this.groundPounding = false;
          }
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = b.y + b.h;
          this.vy = 1.5;
          this.scaleX = 1.25;
          this.scaleY = 0.78;
          this.hitBlock(b, level, false);
        }
      }
    }

    // Moving Platforms (one-way from top)
    for (const p of level.platforms) {
      if (
        this.vy >= 0 &&
        this.x + this.w > p.x + 4 &&
        this.x < p.x + p.w - 4 &&
        this.y + this.h >= p.y &&
        this.y + this.h - this.vy <= p.y + 14
      ) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.onGround = true;
        this.x += p.vx;
      }
    }

    // Bouncy Springs
    for (const s of level.springs) {
      if (aabb(this, s) && this.vy >= 0) {
        this.y = s.y - this.h;
        this.vy = keys.jump ? -17.5 : -13.8;
        this.onGround = false;
        this.groundPounding = false;
        s.compress = 1.0;
        this.scaleX = 0.65;
        this.scaleY = 1.45;
        window.sound.sfxSpring();
        for (let i = 0; i < 10; i++) {
          game.particles.push(new Particle(
            s.x + s.w / 2, s.y,
            (Math.random() - 0.5) * 6, -Math.random() * 4,
            '#ffd93d', 6, 24, 'star'
          ));
        }
      }
    }
  }

  hitBlock(b, level, fromGroundPound = false) {
    b.bounceY = fromGroundPound ? 10 : -10;
    if (b.hidden) b.hidden = false;

    // Damage enemies standing on top of this block
    for (const e of level.enemies) {
      if (!e.dead && Math.abs((e.y + e.h) - b.y) < 8 && e.x + e.w > b.x && e.x < b.x + b.w) {
        e.knockOut(this.x);
      }
    }

    if (b.type === 'question') {
      b.type = 'empty';
      if (b.content === 'coin') {
        window.sound.sfxCoin();
        game.addCoin(b.x + b.w / 2, b.y - 12);
      } else if (b.content === 'powerup') {
        window.sound.sfxPowerupAppear();
        const itemType = this.power === 0 ? 'mushroom' : 'flower';
        level.items.push(new Item(b.x + 4, b.y - 34, itemType));
      } else if (b.content === 'star') {
        window.sound.sfxPowerupAppear();
        level.items.push(new Item(b.x + 4, b.y - 34, 'star'));
      } else if (b.content === '1up') {
        window.sound.sfxPowerupAppear();
        level.items.push(new Item(b.x + 4, b.y - 34, '1up'));
      }
    } else if (b.type === 'brick') {
      if (b.coinsLeft && b.coinsLeft > 0) {
        b.coinsLeft--;
        window.sound.sfxCoin();
        game.addCoin(b.x + b.w / 2, b.y - 12);
        if (b.coinsLeft === 0) b.type = 'empty';
      } else if (this.power > 0 || fromGroundPound) {
        b.broken = true;
        window.sound.sfxBreak();
        game.addScore(50, b.x + 20, b.y);
        game.screenShake = 5;
        for (let i = 0; i < 6; i++) {
          game.particles.push(new Particle(
            b.x + 20, b.y + 20,
            (Math.random() - 0.5) * 9,
            -4 - Math.random() * 6,
            b.brickColor || '#d96b27',
            12, 38, 'brick'
          ));
        }
      } else {
        window.sound.sfxBump();
      }
    } else {
      window.sound.sfxBump();
    }
  }

  takeDamage() {
    if (this.invincibleTimer > 0 || this.starTimer > 0 || this.dead) return;
    if (this.power > 0) {
      this.setPower(this.power - 1);
      this.invincibleTimer = 95;
      window.sound.sfxDamage();
      game.screenShake = 7;
    } else {
      this.die();
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.vy = -11.5;
    this.vx = 0;
    window.sound.starMode = false;
    window.sound.sfxDamage();
    game.screenShake = 10;
    game.lives--;
    game.updateHUD();

    setTimeout(() => {
      if (game.lives <= 0) {
        game.lives = 3;
        game.score = 0;
        game.coins = 0;
      }
      game.loadLevel(game.currentLevel, true);
    }, 1500);
  }

  startGoalSequence(flag) {
    if (this.reachingGoal) return;
    this.reachingGoal = true;
    this.vx = 0;
    this.vy = 0;
    this.x = flag.x - 14;
    this.goalPhase = 'slide';
    this.goalTimer = 0;

    // Height bonus based on how high on the pole Mario grabbed
    const heightRatio = 1 - Math.min(1, Math.max(0, (this.y - flag.y) / flag.h));
    const bonus = Math.round(heightRatio * 40 + 10) * 100;
    game.addScore(bonus, flag.x, this.y);
    window.sound.stopMusic();
    window.sound.sfxVictory();
  }

  updateGoalSequence(level) {
    const flag = level.flag;
    this.goalTimer++;

    if (this.goalPhase === 'slide') {
      flag.bannerY = Math.min(flag.y + flag.h - 48, flag.bannerY + 5);
      if (this.y + this.h < flag.y + flag.h) {
        this.y += 4.5;
      } else {
        this.y = flag.y + flag.h - this.h;
        this.goalPhase = 'walkToCastle';
        this.facing = 1;
      }
    } else if (this.goalPhase === 'walkToCastle') {
      this.vx = 3.2;
      this.x += this.vx;
      this.walkCycle += 0.35;

      // Launch celebratory fireworks!
      if (this.goalTimer % 18 === 0) {
        game.spawnFirework(flag.x + 120 + (Math.random() - 0.5) * 280, 100 + Math.random() * 140);
      }

      if (this.x >= flag.castleX + 68) {
        this.vx = 0;
        this.goalPhase = 'done';
        setTimeout(() => game.completeLevel(), 900);
      }
    }
  }

  draw(ctx, camX) {
    if (this.goalPhase === 'done') return;
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 4) % 2 === 1) return;

    ctx.save();
    const cx = this.x - camX + this.w / 2;
    const by = this.y + this.h;
    ctx.translate(cx, by);
    ctx.scale(this.facing * this.scaleX, this.scaleY);

    // Rainbow Star Aura
    const rainbowColors = ['#ff3b47', '#ff9f1c', '#ffd93d', '#3ddc84', '#48dbfb', '#a55eea'];
    const starColor = this.starTimer > 0
      ? rainbowColors[Math.floor(Date.now() / 45) % rainbowColors.length]
      : null;

    const hatColor = starColor || (this.power === 2 ? '#ffffff' : '#ff2e3b');
    const overallColor = starColor || (this.power === 2 ? '#ff2e3b' : '#2563eb');
    const shirtColor = starColor || (this.power === 2 ? '#ff9f1c' : '#ff2e3b');

    const w = this.w;
    const h = this.h;
    const bob = this.onGround ? Math.sin(this.walkCycle) * 2.5 : 0;
    const legSwing = this.onGround ? Math.sin(this.walkCycle) * 7 : 5;

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1f1b38';

    // Back Foot
    ctx.fillStyle = '#6f3b1c';
    drawRoundedRect(ctx, -11 - legSwing * 0.5, -10, 12, 10, 4);

    // Torso / Shirt
    ctx.fillStyle = shirtColor;
    drawRoundedRect(ctx, -w * 0.42, -h * 0.55 + bob, w * 0.84, h * 0.36, 8);

    // Overalls
    ctx.fillStyle = overallColor;
    drawRoundedRect(ctx, -w * 0.38, -h * 0.42 + bob, w * 0.76, h * 0.25, 6);

    // Yellow Buttons
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(4, -h * 0.32 + bob, 3, 0, Math.PI * 2);
    ctx.fill();

    // Front Foot
    ctx.fillStyle = '#8a4b24';
    drawRoundedRect(ctx, -1 + legSwing * 0.5, -10, 13, 10, 4);

    // Head
    const headY = -h * 0.76 + bob;
    ctx.fillStyle = '#ffcfb3';
    drawRoundedRect(ctx, -13, headY - 12, 26, 23, 9);

    // Expressive Eye & Blush
    ctx.fillStyle = '#1f1b38';
    ctx.beginPath();
    ctx.ellipse(5, headY - 2, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, headY - 4, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Big Nose & Mustache
    ctx.fillStyle = '#ffbfa0';
    drawRoundedRect(ctx, 8, headY - 3, 10, 8, 4);
    ctx.fillStyle = '#4a2511';
    drawRoundedRect(ctx, 2, headY + 4, 14, 5, 2.5);

    // Joyful Cap
    ctx.fillStyle = hatColor;
    drawRoundedRect(ctx, -15, headY - 17, 29, 10, 5);
    drawRoundedRect(ctx, 0, headY - 12, 20, 6, 3); // Cap visor

    // White emblem circle on cap
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2, headY - 12, 4, 0, Math.PI * 2);
    ctx.fill();

    // Swinging Hand (Glove)
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, -5 - legSwing * 0.4, -h * 0.44 + bob, 11, 11, 5);

    ctx.restore();
  }
}

// ============================================================================
// COLLECTIBLE POWERUPS (Mushroom, Fire Flower, Starman, 1-UP)
// ============================================================================
class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y + 28;
    this.targetY = y;
    this.spawning = true;
    this.w = 32;
    this.h = 32;
    this.type = type; // 'mushroom', 'flower', 'star', '1up'
    this.vx = type === 'flower' ? 0 : 2.3;
    this.vy = 0;
    this.collected = false;
  }

  update(level) {
    if (this.spawning) {
      this.y -= 1.5;
      if (this.y <= this.targetY) {
        this.y = this.targetY;
        this.spawning = false;
      }
      return;
    }

    if (this.type !== 'flower') {
      this.vy += 0.42;
      this.x += this.vx;

      // X block collisions
      for (const b of level.blocks) {
        if (b.broken || b.hidden) continue;
        if (aabb(this, b)) {
          if (this.vx > 0) this.x = b.x - this.w;
          else this.x = b.x + b.w;
          this.vx *= -1;
        }
      }

      // Y block collisions
      this.y += this.vy;
      for (const b of level.blocks) {
        if (b.broken || b.hidden) continue;
        if (aabb(this, b)) {
          if (this.vy > 0) {
            this.y = b.y - this.h;
            this.vy = this.type === 'star' ? -8.5 : 0;
          } else if (this.vy < 0) {
            this.y = b.y + b.h;
            this.vy = 1;
          }
        }
      }
    }
  }

  draw(ctx, camX) {
    const x = this.x - camX;
    const y = this.y;
    ctx.save();
    ctx.translate(x + this.w / 2, y + this.h / 2);
    const pulse = 1 + window.sound.beatPulse * 0.08;
    ctx.scale(pulse, pulse);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1f1b38';

    if (this.type === 'mushroom' || this.type === '1up') {
      // Cap
      ctx.fillStyle = this.type === '1up' ? '#2ed573' : '#ff3b47';
      drawRoundedRect(ctx, -15, -15, 30, 20, 10);
      // Spots
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-7, -7, 4.5, 0, Math.PI * 2);
      ctx.arc(7, -7, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // Stem with cute eyes
      ctx.fillStyle = '#ffeaa7';
      drawRoundedRect(ctx, -9, 2, 18, 13, 4);
      ctx.fillStyle = '#1f1b38';
      ctx.fillRect(-4, 5, 2, 5);
      ctx.fillRect(2, 5, 2, 5);
    } else if (this.type === 'flower') {
      // Stem
      ctx.fillStyle = '#2ed573';
      drawRoundedRect(ctx, -3, 2, 6, 13, 2);
      // Petals
      ctx.fillStyle = '#ff6b2b';
      drawRoundedRect(ctx, -14, -14, 28, 19, 9);
      ctx.fillStyle = '#ffd93d';
      drawRoundedRect(ctx, -9, -10, 18, 11, 5);
      ctx.fillStyle = '#1f1b38';
      ctx.fillRect(-4, -6, 2, 4);
      ctx.fillRect(2, -6, 2, 4);
    } else if (this.type === 'star') {
      ctx.fillStyle = '#ffd93d';
      drawStarShape(ctx, 0, 0, 5, 16, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1f1b38';
      ctx.fillRect(-4, -3, 2, 5);
      ctx.fillRect(2, -3, 2, 5);
    }
    ctx.restore();
  }
}

// ============================================================================
// ENEMIES (Shroomba, Koopa Shell-buddy, Flying Bee)
// ============================================================================
class Enemy {
  constructor(x, y, type = 'shroomba') {
    this.x = x;
    this.y = y;
    this.startY = y;
    this.type = type; // 'shroomba', 'koopa', 'bee'
    this.w = 36;
    this.h = type === 'koopa' ? 42 : 36;
    this.vx = -1.6;
    this.vy = 0;
    this.state = 'walk'; // 'walk', 'shell_idle', 'shell_spin'
    this.dead = false;
    this.squishTimer = 0;
    this.animTick = Math.random() * 100;
  }

  update(level) {
    this.animTick += 0.15;
    if (this.dead) {
      if (this.squishTimer > 0) {
        this.squishTimer--;
      } else {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.45;
      }
      return;
    }

    if (this.type === 'bee') {
      this.x += this.vx;
      this.y = this.startY + Math.sin(this.animTick * 0.6) * 38;
      if (Math.sin(this.animTick * 0.1) > 0.98) this.vx *= -1;
      return;
    }

    // Hop synchronously on music beat if Shroomba!
    if (this.type === 'shroomba' && window.sound.beatPulse > 0.92 && this.vy === 0) {
      this.vy = -3.2;
    }

    this.vy += 0.45;
    this.x += this.vx;

    // Collide X with blocks
    for (const b of level.blocks) {
      if (b.broken || b.hidden) continue;
      if (aabb(this, b)) {
        if (this.vx > 0) this.x = b.x - this.w;
        else this.x = b.x + this.w;
        this.vx *= -1;
        if (this.state === 'shell_spin') {
          window.sound.sfxBump();
          if (b.type === 'brick' || b.type === 'question') {
            game.player.hitBlock(b, level, true);
          }
        }
      }
    }

    // Collide Y with blocks
    this.y += this.vy;
    for (const b of level.blocks) {
      if (b.broken || b.hidden) continue;
      if (aabb(this, b)) {
        if (this.vy > 0) {
          this.y = b.y - this.h;
          this.vy = 0;
        }
      }
    }

    // Spinning shell hits other enemies!
    if (this.state === 'shell_spin') {
      for (const other of level.enemies) {
        if (other !== this && !other.dead && aabb(this, other)) {
          other.knockOut(this.x);
          game.addScore(200, other.x, other.y);
        }
      }
    }
  }

  stomp(player) {
    player.stompCombo++;
    const pts = Math.min(1000, player.stompCombo * 100);
    window.sound.sfxStomp(player.stompCombo);
    game.addScore(pts, this.x + 16, this.y);

    if (this.type === 'koopa' && this.state === 'walk') {
      this.state = 'shell_idle';
      this.vx = 0;
      this.h = 32;
      this.y += 10;
    } else if (this.type === 'koopa' && this.state === 'shell_idle') {
      this.state = 'shell_spin';
      this.vx = player.x + player.w / 2 < this.x + this.w / 2 ? 8.5 : -8.5;
    } else if (this.type === 'koopa' && this.state === 'shell_spin') {
      this.state = 'shell_idle';
      this.vx = 0;
    } else {
      this.dead = true;
      this.squishTimer = 28;
    }
  }

  knockOut(sourceX) {
    this.dead = true;
    this.squishTimer = 0;
    this.vy = -8.5;
    this.vx = this.x < sourceX ? -3 : 3;
    window.sound.sfxStomp(2);
    game.addScore(200, this.x, this.y);
  }

  draw(ctx, camX) {
    if (this.dead && this.squishTimer === 0 && this.y > H + 80) return;

    ctx.save();
    const cx = this.x - camX + this.w / 2;
    const by = this.y + this.h;
    ctx.translate(cx, by);

    if (this.dead && this.squishTimer > 0) {
      ctx.scale(1.35, 0.38);
    } else if (this.dead) {
      ctx.scale(1, -1);
      ctx.translate(0, this.h);
    } else {
      const dance = 1 + window.sound.beatPulse * 0.07;
      ctx.scale(this.vx > 0 ? -1 : 1, dance);
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1f1b38';

    if (this.type === 'shroomba') {
      // Feet
      const step = Math.sin(this.animTick * 2) * 4;
      ctx.fillStyle = '#2d1e18';
      drawRoundedRect(ctx, -13 + step, -8, 10, 8, 4);
      drawRoundedRect(ctx, 3 - step, -8, 10, 8, 4);
      // Stem
      ctx.fillStyle = '#ffdfba';
      drawRoundedRect(ctx, -10, -18, 20, 12, 4);
      // Mushroom Head
      ctx.fillStyle = '#c4622d';
      drawRoundedRect(ctx, -18, -36, 36, 22, 11);
      // Cute determined eyebrows & eyes
      ctx.fillStyle = '#ffffff';
      drawRoundedRect(ctx, -11, -29, 7, 9, 3);
      drawRoundedRect(ctx, 3, -29, 7, 9, 3);
      ctx.fillStyle = '#1f1b38';
      ctx.fillRect(-9, -26, 3, 5);
      ctx.fillRect(4, -26, 3, 5);
    } else if (this.type === 'koopa') {
      if (this.state === 'walk') {
        const step = Math.sin(this.animTick * 2) * 4;
        ctx.fillStyle = '#ffbe0b';
        drawRoundedRect(ctx, -12 + step, -8, 10, 8, 4);
        drawRoundedRect(ctx, 4 - step, -8, 10, 8, 4);
        // Green Shell
        ctx.fillStyle = '#2ed573';
        drawRoundedRect(ctx, -14, -30, 28, 24, 12);
        // Head
        ctx.fillStyle = '#ffd93d';
        drawRoundedRect(ctx, -19, -41, 16, 16, 7);
        ctx.fillStyle = '#1f1b38';
        ctx.fillRect(-15, -37, 3, 5);
      } else {
        // Shell only
        ctx.fillStyle = '#2ed573';
        drawRoundedRect(ctx, -16, -28, 32, 28, 13);
        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, -10, -21, 20, 14, 6);
      }
    } else if (this.type === 'bee') {
      // Wings
      const wingFlap = Math.sin(this.animTick * 5) * 5;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      drawRoundedRect(ctx, -6, -38 + wingFlap, 14, 12, 6);
      // Striped body
      ctx.fillStyle = '#ffd93d';
      drawRoundedRect(ctx, -16, -28, 32, 24, 12);
      ctx.fillStyle = '#1f1b38';
      ctx.fillRect(-4, -26, 5, 20);
      ctx.fillRect(5, -25, 5, 18);
      ctx.fillRect(-11, -20, 3, 5);
    }

    ctx.restore();
  }
}

// ============================================================================
// LEVEL GENERATOR (3 Distinct Joyful Worlds!)
// ============================================================================
function buildLevel(index) {
  const blocks = [];
  const coins = [];
  const enemies = [];
  const items = [];
  const platforms = [];
  const springs = [];
  const decorations = [];

  const themes = [
    {
      name: '1-1',
      title: 'Sunny Meadow 🌻',
      skyTop: '#38b6ff',
      skyBottom: '#b8ecff',
      groundTop: '#4cd964',
      groundBody: '#c87d4b',
      brickColor: '#e06d2b',
      hillColors: ['#55e673', '#38c958', '#2bb34b']
    },
    {
      name: '1-2',
      title: 'Sky Carnival 🌈',
      skyTop: '#ff7eb3',
      skyBottom: '#ffefba',
      groundTop: '#ffd93d',
      groundBody: '#8c52ff',
      brickColor: '#ff5e7e',
      hillColors: ['#ff9ff3', '#feca57', '#48dbfb']
    },
    {
      name: '1-3',
      title: 'Starlight Fiesta 🎆',
      skyTop: '#191338',
      skyBottom: '#432c7a',
      groundTop: '#38ef7d',
      groundBody: '#302b63',
      brickColor: '#8c52ff',
      hillColors: ['#5f27cd', '#341f97', '#00d2d3']
    }
  ];

  const theme = themes[index % themes.length];
  const groundY = H - TILE * 2; // 496

  // Helper to add ground segment
  function addGround(startTile, lengthTiles, topY = groundY) {
    for (let i = 0; i < lengthTiles; i++) {
      const tx = (startTile + i) * TILE;
      blocks.push({
        x: tx, y: topY, w: TILE, h: H - topY + 40,
        type: 'ground', bounceY: 0,
        isFirst: i === 0, isLast: i === lengthTiles - 1
      });
      // Occasional cheerful flowers on ground
      if (i > 0 && i < lengthTiles - 1 && Math.random() < 0.28) {
        decorations.push({
          x: tx + 12,
          y: topY,
          type: Math.random() < 0.35 ? 'bush' : 'flower',
          color: ['#ff6bcb', '#ffd93d', '#ff3b47', '#48dbfb'][Math.floor(Math.random() * 4)]
        });
      }
    }
  }

  function addPipe(tileX, heightTiles) {
    const px = tileX * TILE;
    const h = heightTiles * TILE;
    blocks.push({
      x: px,
      y: groundY - h,
      w: TILE * 1.8,
      h: h,
      type: 'pipe',
      bounceY: 0
    });
  }

  function addBlock(tileX, tileYFromGround, type = 'question', content = 'coin', coinsLeft = 0) {
    blocks.push({
      x: tileX * TILE,
      y: groundY - tileYFromGround * TILE,
      w: TILE,
      h: TILE,
      type,
      content,
      coinsLeft,
      brickColor: theme.brickColor,
      bounceY: 0
    });
  }

  function addCoinArc(centerTileX, tileYFromGround, count = 5) {
    for (let i = 0; i < count; i++) {
      const offset = i - (count - 1) / 2;
      coins.push({
        x: (centerTileX + offset * 0.95) * TILE + 8,
        y: groundY - tileYFromGround * TILE - Math.cos(offset * 0.6) * 32,
        w: 24,
        h: 24,
        collected: false
      });
    }
  }

  // --- LEVEL 0: 1-1 SUNNY MEADOW ---
  if (index === 0) {
    addGround(0, 22);
    addGround(25, 24);
    addGround(52, 28);
    addGround(83, 32);

    // Intro Question Blocks & Powerups
    addBlock(5, 3, 'question', 'coin');
    addBlock(8, 3, 'brick');
    addBlock(9, 3, 'question', 'powerup');
    addBlock(10, 3, 'brick', 'coin', 5); // Multi-coin brick!
    addBlock(11, 3, 'question', 'coin');
    addBlock(12, 3, 'brick');
    addBlock(10, 7, 'question', 'star'); // High star block!

    addCoinArc(15, 3, 5);
    addPipe(18, 2);
    enemies.push(new Enemy(14 * TILE, groundY - 40, 'shroomba'));
    enemies.push(new Enemy(20 * TILE, groundY - 40, 'shroomba'));

    // Spring & high blocks over gap
    springs.push({ x: 21 * TILE, y: groundY - 28, w: 36, h: 28, compress: 0 });
    addCoinArc(23.5, 6, 5);

    // Second island
    addPipe(28, 3);
    addBlock(33, 3, 'brick');
    addBlock(34, 3, 'question', 'powerup');
    addBlock(35, 3, 'brick');
    addBlock(36, 7, 'brick');
    addBlock(37, 7, 'question', '1up');
    addBlock(38, 7, 'brick');

    enemies.push(new Enemy(32 * TILE, groundY - 42, 'koopa'));
    enemies.push(new Enemy(39 * TILE, groundY - 40, 'shroomba'));
    enemies.push(new Enemy(41 * TILE, groundY - 40, 'shroomba'));
    addPipe(44, 2);

    // Moving Platform over second gap
    platforms.push({
      x: 49 * TILE, startX: 48.5 * TILE, endX: 51.5 * TILE,
      y: groundY - TILE * 2, w: TILE * 2.5, h: 18, vx: 1.6
    });

    // Third island: Starman & Baddie parade!
    addBlock(55, 3, 'question', 'star');
    addCoinArc(60, 4, 7);
    for (let i = 0; i < 5; i++) {
      enemies.push(new Enemy((61 + i * 2) * TILE, groundY - 40, i % 2 === 0 ? 'shroomba' : 'koopa'));
    }

    springs.push({ x: 74 * TILE, y: groundY - 28, w: 36, h: 28, compress: 0 });
    platforms.push({
      x: 79 * TILE, startX: 78.5 * TILE, endX: 82 * TILE,
      y: groundY - TILE * 4, w: TILE * 2.5, h: 18, vx: 1.8
    });

    // Staircase to Flagpole
    for (let step = 1; step <= 6; step++) {
      for (let h = 1; h <= step; h++) {
        addBlock(86 + step, h, 'hard');
      }
    }
  }

  // --- LEVEL 1: 1-2 SKY CARNIVAL ---
  else if (index === 1) {
    addGround(0, 14);
    addGround(19, 12, groundY - TILE);
    addGround(36, 15);
    addGround(56, 14, groundY - TILE * 2);
    addGround(75, 32);

    addBlock(5, 3, 'question', 'powerup');
    addBlock(6, 3, 'question', 'coin');
    springs.push({ x: 11 * TILE, y: groundY - 28, w: 36, h: 28, compress: 0 });
    addCoinArc(16, 6, 5);

    platforms.push({
      x: 15 * TILE, startX: 14.5 * TILE, endX: 18 * TILE,
      y: groundY - TILE * 3, w: TILE * 2.5, h: 18, vx: 2.0
    });

    enemies.push(new Enemy(22 * TILE, groundY - TILE - 42, 'koopa'));
    enemies.push(new Enemy(26 * TILE, groundY - TILE * 4, 'bee'));
    addBlock(24, 4, 'question', 'powerup');
    addBlock(25, 4, 'brick', 'coin', 6);

    platforms.push({
      x: 32 * TILE, startX: 31 * TILE, endX: 35 * TILE,
      y: groundY - TILE * 2, w: TILE * 2.5, h: 18, vx: 2.2
    });

    springs.push({ x: 38 * TILE, y: groundY - 28, w: 36, h: 28, compress: 0 });
    addBlock(42, 4, 'question', 'star');
    addCoinArc(45, 5, 7);
    enemies.push(new Enemy(44 * TILE, groundY - 40, 'shroomba'));
    enemies.push(new Enemy(47 * TILE, groundY - 42, 'koopa'));
    enemies.push(new Enemy(50 * TILE, groundY - TILE * 4, 'bee'));

    platforms.push({
      x: 52 * TILE, startX: 51 * TILE, endX: 55 * TILE,
      y: groundY - TILE * 3, w: TILE * 2.5, h: 18, vx: 2.0
    });

    enemies.push(new Enemy(61 * TILE, groundY - TILE * 2 - 40, 'shroomba'));
    enemies.push(new Enemy(65 * TILE, groundY - TILE * 2 - 42, 'koopa'));
    springs.push({ x: 68 * TILE, y: groundY - TILE * 2 - 28, w: 36, h: 28, compress: 0 });
    addCoinArc(71.5, 7, 6);

    for (let step = 1; step <= 7; step++) {
      for (let h = 1; h <= step; h++) {
        addBlock(79 + step, h, 'hard');
      }
    }
  }

  // --- LEVEL 2: 1-3 STARLIGHT FIESTA ---
  else {
    addGround(0, 16);
    addGround(20, 16);
    addGround(40, 18);
    addGround(63, 14);
    addGround(81, 30);

    addBlock(4, 3, 'question', 'powerup');
    addBlock(8, 3, 'question', 'powerup');
    addBlock(6, 7, 'question', '1up');
    enemies.push(new Enemy(11 * TILE, groundY - 42, 'koopa'));
    enemies.push(new Enemy(14 * TILE, groundY - TILE * 4, 'bee'));

    springs.push({ x: 15 * TILE, y: groundY - 28, w: 36, h: 28, compress: 0 });
    addCoinArc(18, 6, 5);

    addPipe(22, 2);
    addBlock(26, 3, 'brick');
    addBlock(27, 3, 'question', 'star');
    addBlock(28, 3, 'brick');
    enemies.push(new Enemy(29 * TILE, groundY - 40, 'shroomba'));
    enemies.push(new Enemy(31 * TILE, groundY - 40, 'shroomba'));
    enemies.push(new Enemy(33 * TILE, groundY - 42, 'koopa'));
    addPipe(34, 3);

    platforms.push({
      x: 37 * TILE, startX: 36 * TILE, endX: 39.5 * TILE,
      y: groundY - TILE * 3, w: TILE * 2.5, h: 18, vx: 2.3
    });

    addCoinArc(45, 4, 7);
    addBlock(48, 3, 'question', 'powerup');
    enemies.push(new Enemy(46 * TILE, groundY - 40, 'shroomba'));
    enemies.push(new Enemy(51 * TILE, groundY - 42, 'koopa'));
    enemies.push(new Enemy(54 * TILE, groundY - TILE * 4, 'bee'));

    springs.push({ x: 56 * TILE, y: groundY - 28, w: 36, h: 28, compress: 0 });
    platforms.push({
      x: 59 * TILE, startX: 58 * TILE, endX: 62 * TILE,
      y: groundY - TILE * 4, w: TILE * 2.5, h: 18, vx: 2.4
    });

    for (let i = 0; i < 4; i++) {
      enemies.push(new Enemy((66 + i * 2) * TILE, groundY - 40, i % 2 === 0 ? 'koopa' : 'shroomba'));
    }
    springs.push({ x: 75 * TILE, y: groundY - 28, w: 36, h: 28, compress: 0 });
    addCoinArc(78, 6, 6);

    for (let step = 1; step <= 8; step++) {
      for (let h = 1; h <= step; h++) {
        addBlock(82 + step, h, 'hard');
      }
    }
  }

  // Flagpole & Castle at the end of every level
  const flagX = 97 * TILE;
  const flag = {
    x: flagX,
    y: groundY - TILE * 8,
    w: 16,
    h: TILE * 8,
    bannerY: groundY - TILE * 7.5,
    castleX: flagX + 140
  };

  // Cloud background layer
  const clouds = [];
  for (let i = 0; i < 28; i++) {
    clouds.push({
      x: i * 220 + Math.random() * 90,
      y: 45 + Math.random() * 145,
      scale: 0.75 + Math.random() * 0.55,
      speed: 0.15 + Math.random() * 0.2
    });
  }

  return {
    theme,
    blocks,
    coins,
    enemies,
    items,
    platforms,
    springs,
    decorations,
    clouds,
    flag,
    checkpointX: 46 * TILE,
    checkpointReached: false
  };
}

// ============================================================================
// MAIN GAME CONTROLLER
// ============================================================================
class Game {
  constructor() {
    this.state = 'title'; // 'title', 'playing', 'victory'
    this.selectedStartLevel = 0;
    this.currentLevel = 0;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.timeLeft = 400;
    this.frameCounter = 0;

    this.camX = 0;
    this.screenShake = 0;
    this.particles = [];
    this.floatingTexts = [];
    this.fireballs = [];

    this.level = buildLevel(0);
    this.player = new Player(100, H - TILE * 4);
  }

  startNewGame(levelIdx = 0) {
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.loadLevel(levelIdx, false);
  }

  loadLevel(levelIdx, keepCheckpoint = false) {
    const hadCheckpoint = keepCheckpoint && this.level && this.level.checkpointReached;
    this.currentLevel = levelIdx;
    this.level = buildLevel(levelIdx);
    if (hadCheckpoint) {
      this.level.checkpointReached = true;
    }

    const spawnX = hadCheckpoint ? this.level.checkpointX : 100;
    this.player = new Player(spawnX, H - TILE * 4);
    this.camX = Math.max(0, spawnX - 240);
    this.timeLeft = 400;
    this.particles = [];
    this.floatingTexts = [];
    this.fireballs = [];
    this.state = 'playing';

    window.sound.starMode = false;
    window.sound.themeIndex = levelIdx;
    window.sound.startMusic(levelIdx);
    this.updateHUD();
  }

  addScore(pts, x, y) {
    this.score += pts;
    if (x !== undefined && y !== undefined) {
      this.floatingTexts.push(new FloatingText(x, y, `+${pts}`, '#ffd93d'));
    }
    this.updateHUD();
  }

  addCoin(x, y) {
    this.coins++;
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives++;
      window.sound.sfxPowerupCollect();
      this.floatingTexts.push(new FloatingText(x, y - 20, '1-UP! ❤️', '#2ed573'));
    }
    this.addScore(100, x, y);
    for (let i = 0; i < 7; i++) {
      this.particles.push(new Particle(
        x, y,
        (Math.random() - 0.5) * 5,
        -2 - Math.random() * 4,
        '#ffd93d', 6, 22, 'star'
      ));
    }
  }

  spawnFirework(x, y) {
    window.sound.sfxFirework();
    const colors = ['#ff3b47', '#ffd93d', '#3ddc84', '#48dbfb', '#ff6bcb', '#a55eea'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const spd = 2 + Math.random() * 4.5;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        c, 7, 38, 'star'
      ));
    }
  }

  completeLevel() {
    this.state = 'victory';
    victoryTitle.textContent = `${this.level.theme.name} ${this.level.theme.title} CLEAR! 🎉`;
    victoryStats.textContent = `Score: ${this.score}  •  Coins: ${this.coins}  •  Time Bonus: +${this.timeLeft * 10}`;
    this.score += this.timeLeft * 10;
    this.updateHUD();
    victoryScreen.classList.add('active');
  }

  updateHUD() {
    elScore.textContent = String(this.score).padStart(6, '0');
    elCoins.textContent = 'x' + String(this.coins).padStart(2, '0');
    elWorld.textContent = this.level.theme.name;
    elTime.textContent = String(Math.ceil(this.timeLeft)).padStart(3, '0');
    elLives.textContent = 'x' + this.lives;
  }

  update() {
    this.frameCounter++;
    // Decay music beat pulse smoothly
    window.sound.beatPulse *= 0.88;

    // Drift clouds even on title screen
    for (const c of this.level.clouds) {
      c.x -= c.speed;
      if (c.x < -200) c.x += 6000;
    }

    if (this.state !== 'playing') return;

    // Level Timer
    if (!this.player.reachingGoal && !this.player.dead) {
      this.timeLeft -= 1 / 60;
      if (this.frameCounter % 30 === 0) this.updateHUD();
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.player.die();
      }
    }

    // Update Moving Platforms
    for (const p of this.level.platforms) {
      p.x += p.vx;
      if (p.x > p.endX || p.x < p.startX) p.vx *= -1;
    }

    // Update Springs
    for (const s of this.level.springs) {
      s.compress *= 0.8;
    }

    // Update Block Bounces
    for (const b of this.level.blocks) {
      if (b.bounceY !== 0) {
        b.bounceY *= 0.72;
        if (Math.abs(b.bounceY) < 0.4) b.bounceY = 0;
      }
    }

    // Update Player
    this.player.update(this.level);

    // Checkpoint Check
    if (!this.level.checkpointReached && this.player.x >= this.level.checkpointX) {
      this.level.checkpointReached = true;
      window.sound.sfxPowerupCollect();
      this.floatingTexts.push(new FloatingText(this.level.checkpointX, H - TILE * 4, 'CHECKPOINT! 🚩', '#3ddc84'));
      for (let i = 0; i < 16; i++) {
        this.particles.push(new Particle(
          this.level.checkpointX, H - TILE * 3,
          (Math.random() - 0.5) * 6, -Math.random() * 6,
          '#3ddc84', 7, 30, 'star'
        ));
      }
    }

    // Collect Coins
    for (const c of this.level.coins) {
      if (!c.collected && aabb(this.player, c)) {
        c.collected = true;
        window.sound.sfxCoin();
        this.addCoin(c.x + 12, c.y);
      }
    }

    // Update & Collect Powerup Items
    for (const item of this.level.items) {
      if (item.collected) continue;
      item.update(this.level);
      if (aabb(this.player, item)) {
        item.collected = true;
        window.sound.sfxPowerupCollect();
        if (item.type === 'mushroom') {
          if (this.player.power === 0) this.player.setPower(1);
          this.addScore(1000, item.x, item.y);
          this.floatingTexts.push(new FloatingText(item.x, item.y - 18, 'SUPER! 🍄', '#ff3b47'));
        } else if (item.type === 'flower') {
          this.player.setPower(2);
          this.addScore(1000, item.x, item.y);
          this.floatingTexts.push(new FloatingText(item.x, item.y - 18, 'FIRE MARIO! 🔥', '#ff9f1c'));
        } else if (item.type === 'star') {
          this.player.starTimer = 600; // 10 seconds of rainbow invincibility!
          window.sound.starMode = true;
          this.addScore(1000, item.x, item.y);
          this.floatingTexts.push(new FloatingText(item.x, item.y - 18, 'STAR POWER! ⭐', '#ffd93d'));
        } else if (item.type === '1up') {
          this.lives++;
          this.updateHUD();
          this.floatingTexts.push(new FloatingText(item.x, item.y - 18, '1-UP! ❤️', '#2ed573'));
        }
      }
    }

    // Update Fireballs
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const f = this.fireballs[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.45;

      if (this.frameCounter % 2 === 0) {
        this.particles.push(new Particle(f.x + 7, f.y + 7, 0, 0, '#ff9f1c', 5, 10));
      }

      let remove = f.x > this.camX + W + 100 || f.x < this.camX - 100 || f.y > H;

      for (const b of this.level.blocks) {
        if (b.broken || b.hidden) continue;
        if (aabb(f, b)) {
          if (f.y + f.h - f.vy <= b.y + 8) {
            f.y = b.y - f.h;
            f.vy = -6.2;
            f.bounces++;
            if (f.bounces > 4) remove = true;
          } else {
            remove = true;
          }
        }
      }

      for (const e of this.level.enemies) {
        if (!e.dead && aabb(f, e)) {
          e.knockOut(f.x);
          remove = true;
          break;
        }
      }

      if (remove) {
        for (let k = 0; k < 5; k++) {
          this.particles.push(new Particle(f.x, f.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, '#ff6b2b', 5, 14, 'star'));
        }
        this.fireballs.splice(i, 1);
      }
    }

    // Update Enemies & Player-Enemy Collisions
    for (const e of this.level.enemies) {
      if (Math.abs(e.x - this.player.x) < W * 1.1) {
        e.update(this.level);
      }
      if (!e.dead && !this.player.dead && aabb(this.player, e)) {
        if (this.player.starTimer > 0) {
          e.knockOut(this.player.x);
        } else if (this.player.vy > 0 && this.player.y + this.player.h - this.player.vy <= e.y + 18) {
          e.stomp(this.player);
          this.player.vy = keys.jump ? -11.5 : -8.5;
          this.player.scaleX = 1.3;
          this.player.scaleY = 0.72;
        } else if (e.type === 'koopa' && e.state === 'shell_idle') {
          e.stomp(this.player);
        } else {
          this.player.takeDamage();
        }
      }
    }

    // Flagpole Goal Check
    const flag = this.level.flag;
    if (!this.player.reachingGoal && aabb(this.player, { x: flag.x - 10, y: flag.y, w: 36, h: flag.h })) {
      this.player.startGoalSequence(flag);
    }

    // Update Particles & Floating Texts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update();
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Smooth Camera with lookahead
    const targetCamX = Math.max(0, this.player.x - W * 0.35 + this.player.vx * 18);
    this.camX = lerp(this.camX, targetCamX, 0.12);

    if (this.screenShake > 0) {
      this.screenShake *= 0.82;
      if (this.screenShake < 0.4) this.screenShake = 0;
    }
  }

  // ==========================================================================
  // RENDERING THE LIVING WORLD
  // ==========================================================================
  draw() {
    const theme = this.level.theme;
    ctx.save();

    if (this.screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake * 2,
        (Math.random() - 0.5) * this.screenShake * 2
      );
    }

    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, theme.skyTop);
    skyGrad.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Cheerful Sun or Starry Night Sky
    if (this.currentLevel === 2) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 197) % W);
        const sy = ((i * 93) % 280);
        const twinkle = 1.5 + Math.sin(this.frameCounter * 0.08 + i) * 1.2;
        ctx.beginPath();
        ctx.arc(sx, sy, twinkle, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Smiling Bouncing Sun!
      const sunPulse = 1 + window.sound.beatPulse * 0.08;
      ctx.save();
      ctx.translate(W - 110, 95);
      ctx.scale(sunPulse, sunPulse);
      ctx.fillStyle = 'rgba(255, 217, 61, 0.28)';
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd93d';
      ctx.strokeStyle = '#1f1b38';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Sun eyes & smile
      ctx.fillStyle = '#1f1b38';
      ctx.beginPath();
      ctx.arc(-12, -6, 4, 0, Math.PI * 2);
      ctx.arc(12, -6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 4, 12, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Parallax Dancing Hills with Eyes!
    const hillBounce = window.sound.beatPulse * 10;
    for (let i = 0; i < 16; i++) {
      const hx = i * 320 - (this.camX * 0.35) % 320;
      const hw = 240 + (i % 3) * 50;
      const hh = 120 + (i % 2) * 55 + hillBounce;
      const hy = H - TILE * 2;
      ctx.save();
      ctx.fillStyle = theme.hillColors[i % theme.hillColors.length];
      ctx.strokeStyle = '#1f1b38';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, hw / 2, Math.PI, 0);
      ctx.fill();
      ctx.stroke();

      // Cute eyes on the hills (Super Mario World / Wonder style!)
      ctx.fillStyle = '#1f1b38';
      ctx.fillRect(hx - 14, hy - hh * 0.55, 5, 13);
      ctx.fillRect(hx + 8, hy - hh * 0.55, 5, 13);
      ctx.restore();
    }

    // 4. Smiling Parallax Clouds
    for (const c of this.level.clouds) {
      const cx = c.x - this.camX * 0.5;
      if (cx < -150 || cx > W + 150) continue;
      ctx.save();
      ctx.translate(cx, c.y);
      const s = c.scale * (1 + window.sound.beatPulse * 0.04);
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = '#1f1b38';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, -45, -18, 90, 38, 19);
      ctx.beginPath();
      ctx.arc(-16, -18, 20, Math.PI, 0);
      ctx.arc(14, -22, 24, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#1f1b38';
      ctx.fillRect(-12, -8, 3.5, 8);
      ctx.fillRect(8, -8, 3.5, 8);
      ctx.restore();
    }

    // 5. Ground Flowers & Bushes dancing to the beat
    for (const d of this.level.decorations) {
      const dx = d.x - this.camX;
      if (dx < -60 || dx > W + 60) continue;
      ctx.save();
      ctx.translate(dx, d.y);
      const sway = Math.sin(this.frameCounter * 0.1 + d.x) * 0.12;
      ctx.rotate(sway);
      ctx.strokeStyle = '#1f1b38';
      ctx.lineWidth = 2;
      if (d.type === 'flower') {
        ctx.fillStyle = '#2ed573';
        ctx.fillRect(-2, -18, 4, 18);
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(0, -20, 8 + window.sound.beatPulse * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -20, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#2ed573';
        drawRoundedRect(ctx, -22, -20 - window.sound.beatPulse * 3, 44, 20 + window.sound.beatPulse * 3, 10);
      }
      ctx.restore();
    }

    // 6. Checkpoint Flag
    const cpX = this.level.checkpointX - this.camX;
    if (cpX > -80 && cpX < W + 80) {
      const cpY = H - TILE * 2;
      ctx.save();
      ctx.strokeStyle = '#1f1b38';
      ctx.lineWidth = 3;
      ctx.fillStyle = '#dfe4ea';
      ctx.fillRect(cpX, cpY - 72, 6, 72);
      ctx.strokeRect(cpX, cpY - 72, 6, 72);
      ctx.fillStyle = this.level.checkpointReached ? '#2ed573' : '#ff3b47';
      ctx.beginPath();
      ctx.moveTo(cpX + 6, cpY - 70);
      ctx.lineTo(cpX + 42, cpY - 56);
      ctx.lineTo(cpX + 6, cpY - 42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 7. End Flagpole & Joyful Castle
    this.drawGoalAndCastle(ctx);

    // 8. Emerging Items
    for (const item of this.level.items) {
      if (!item.collected) item.draw(ctx, this.camX);
    }

    // 9. Blocks, Bricks, Question Blocks, Pipes
    for (const b of this.level.blocks) {
      if (b.broken || b.hidden) continue;
      if (b.x + b.w < this.camX - 60 || b.x > this.camX + W + 60) continue;
      this.drawBlock(ctx, b, theme);
    }

    // 10. Moving Platforms & Bouncy Springs
    for (const p of this.level.platforms) {
      const px = p.x - this.camX;
      ctx.save();
      ctx.fillStyle = '#ffd93d';
      ctx.strokeStyle = '#1f1b38';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, px, p.y, p.w, p.h, 8);
      ctx.restore();
    }

    for (const s of this.level.springs) {
      const sx = s.x - this.camX;
      const sh = s.h * (1 - s.compress * 0.45);
      const sy = s.y + (s.h - sh);
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1f1b38';
      ctx.fillStyle = '#dfe4ea';
      drawRoundedRect(ctx, sx + 6, sy + 6, s.w - 12, sh - 6, 4);
      ctx.fillStyle = '#ff3b47';
      drawRoundedRect(ctx, sx, sy, s.w, 10, 5);
      ctx.restore();
    }

    // 11. Floating Coins
    for (const c of this.level.coins) {
      if (c.collected) continue;
      const cx = c.x - this.camX;
      if (cx < -40 || cx > W + 40) continue;
      const spinW = Math.max(6, Math.abs(Math.cos(this.frameCounter * 0.08 + c.x * 0.02)) * 22);
      ctx.save();
      ctx.translate(cx + 12, c.y + 12 + Math.sin(this.frameCounter * 0.08 + c.x) * 3);
      ctx.fillStyle = '#ffd93d';
      ctx.strokeStyle = '#1f1b38';
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, -spinW / 2, -12, spinW, 24, spinW / 2);
      ctx.restore();
    }

    // 12. Enemies
    for (const e of this.level.enemies) {
      if (e.x + e.w < this.camX - 80 || e.x > this.camX + W + 80) continue;
      e.draw(ctx, this.camX);
    }

    // 13. Fireballs
    for (const f of this.fireballs) {
      ctx.save();
      ctx.translate(f.x - this.camX + 7, f.y + 7);
      ctx.fillStyle = '#ff3b47';
      ctx.strokeStyle = '#ffd93d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 14. Player (Mario)
    this.player.draw(ctx, this.camX);

    // 15. Particles & Score Popups
    for (const p of this.particles) p.draw(ctx, this.camX);
    for (const ft of this.floatingTexts) ft.draw(ctx, this.camX);

    ctx.restore();
  }

  drawBlock(ctx, b, theme) {
    const x = b.x - this.camX;
    const y = b.y + b.bounceY;
    ctx.save();
    ctx.strokeStyle = '#1f1b38';
    ctx.lineWidth = 2.5;

    if (b.type === 'ground') {
      ctx.fillStyle = theme.groundBody;
      ctx.fillRect(x, y, b.w + 1, b.h);
      // Grassy top lip
      ctx.fillStyle = theme.groundTop;
      ctx.fillRect(x, y, b.w + 1, 14);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + b.w + 1, y);
      ctx.stroke();
    } else if (b.type === 'pipe') {
      const grad = ctx.createLinearGradient(x, y, x + b.w, y);
      grad.addColorStop(0, '#2ed573');
      grad.addColorStop(0.35, '#7bed9f');
      grad.addColorStop(1, '#1e90ff');
      ctx.fillStyle = grad;
      drawRoundedRect(ctx, x + 4, y + 24, b.w - 8, b.h - 24, 4);
      drawRoundedRect(ctx, x, y, b.w, 26, 6);
    } else if (b.type === 'question') {
      const pulse = window.sound.beatPulse * 2;
      ctx.fillStyle = '#ffbe0b';
      drawRoundedRect(ctx, x - pulse / 2, y - pulse / 2, b.w + pulse, b.h + pulse, 8);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', x + b.w / 2, y + 28);
    } else if (b.type === 'brick') {
      ctx.fillStyle = b.brickColor || '#e06d2b';
      drawRoundedRect(ctx, x, y, b.w, b.h, 6);
      ctx.beginPath();
      ctx.moveTo(x, y + b.h / 2);
      ctx.lineTo(x + b.w, y + b.h / 2);
      ctx.moveTo(x + b.w / 2, y);
      ctx.lineTo(x + b.w / 2, y + b.h / 2);
      ctx.stroke();
    } else if (b.type === 'hard') {
      ctx.fillStyle = '#a4b0be';
      drawRoundedRect(ctx, x, y, b.w, b.h, 6);
      ctx.fillStyle = '#dfe4ea';
      ctx.fillRect(x + 6, y + 6, b.w - 12, b.h - 12);
    } else if (b.type === 'empty') {
      ctx.fillStyle = '#8395a7';
      drawRoundedRect(ctx, x, y, b.w, b.h, 8);
    }

    ctx.restore();
  }

  drawGoalAndCastle(ctx) {
    const flag = this.level.flag;
    const fx = flag.x - this.camX;
    if (fx < -200 || fx > W + 300) return;

    ctx.save();
    ctx.strokeStyle = '#1f1b38';
    ctx.lineWidth = 3;

    // Pole
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx + 4, flag.y, 8, flag.h);
    ctx.strokeRect(fx + 4, flag.y, 8, flag.h);

    // Golden Top Ball
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(fx + 8, flag.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flag Banner
    ctx.fillStyle = '#ff3b47';
    ctx.beginPath();
    ctx.moveTo(fx + 12, flag.bannerY);
    ctx.lineTo(fx + 66, flag.bannerY + 18);
    ctx.lineTo(fx + 12, flag.bannerY + 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Castle
    const cx = flag.castleX - this.camX;
    const cy = flag.y + flag.h;
    ctx.fillStyle = '#e58e26';
    drawRoundedRect(ctx, cx, cy - 120, 140, 120, 8);
    ctx.fillStyle = '#b71540';
    drawRoundedRect(ctx, cx + 25, cy - 165, 90, 50, 6);
    // Castle Door
    ctx.fillStyle = '#1f1b38';
    ctx.beginPath();
    ctx.arc(cx + 70, cy, 26, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }
}

const game = new Game();

function loop() {
  game.update();
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
