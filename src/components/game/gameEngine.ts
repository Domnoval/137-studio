// Game engine and physics
import Matter from 'matter-js';
import { TAROT_CARDS, DEATH_MESSAGES, SCORING, SCORE_MILESTONES, ZODIAC_PLANETS, SACRED_GLYPHS } from './gameData';

export interface GameState {
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  playerPos: { x: number; y: number };
  playerVel: { x: number; y: number };
  bumpers: Bumper[];
  obstacles: Obstacle[];
  glyphs: Glyph[];
  effects: Effect[];
  currentTarotCard?: TarotCard;
  lastDeathMessage?: string;
  showDeathMessage: number;
  gameStarted: boolean;
  highScore: number;
}

export interface Bumper {
  x: number;
  y: number;
  type: 'circle' | 'triangle' | 'hexagon';
  size: number;
  hit?: boolean;
  hitTime?: number;
  pointUp?: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  vx: number;
  symbol: string;
  lane: number;
}

export interface Glyph {
  x: number;
  y: number;
  symbol: string;
  collected?: boolean;
}

export interface Effect {
  type: string;
  endTime: number;
  [key: string]: any;
}

export interface TarotCard {
  name: string;
  effect: string;
  duration?: number;
  description: string;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private gameState: GameState;
  private animationId?: number;
  private lastTime = 0;
  private matterEngine: any;
  private matterModule: any;
  private playerBody: any;
  private bumperBodies: any[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gameState = this.createInitialState();
  }

  async initMatter() {
    const MatterJS = await import('matter-js');
    this.matterModule = MatterJS;
    
    this.matterEngine = MatterJS.Engine.create();
    this.matterEngine.world.gravity.y = 0.8;
    
    // Create player body
    this.playerBody = MatterJS.Bodies.circle(
      this.gameState.playerPos.x, 
      this.gameState.playerPos.y, 
      15, 
      { restitution: 0.8, density: 0.001, isStatic: true }
    );
    MatterJS.World.add(this.matterEngine.world, this.playerBody);
    
    this.createBumpers(MatterJS);
  }

  private createInitialState(): GameState {
    const highScore = parseInt(localStorage.getItem('137-game-high-score') || '0');
    
    return {
      score: 0,
      lives: 3,
      level: 1,
      gameOver: false,
      playerPos: { x: 300, y: 750 },
      playerVel: { x: 0, y: 0 },
      bumpers: [],
      obstacles: [],
      glyphs: [],
      effects: [],
      showDeathMessage: 0,
      gameStarted: false,
      highScore
    };
  }

  private createBumpers(MatterJS: any) {
    
    this.gameState.bumpers = [];
    this.bumperBodies = [];
    
    // Create sacred geometry layout
    const bumperConfigs = [
      // Circle bumpers (Seed of Life pattern)
      { x: 150, y: 600, type: 'circle', size: 25 },
      { x: 450, y: 600, type: 'circle', size: 25 },
      { x: 300, y: 500, type: 'circle', size: 30 },
      { x: 200, y: 400, type: 'circle', size: 25 },
      { x: 400, y: 400, type: 'circle', size: 25 },
      
      // Triangle bumpers
      { x: 100, y: 350, type: 'triangle', size: 40, pointUp: true },
      { x: 500, y: 350, type: 'triangle', size: 40, pointUp: false },
      { x: 300, y: 300, type: 'triangle', size: 35, pointUp: true },
      
      // Hexagon bumpers (bonus zones)
      { x: 150, y: 200, type: 'hexagon', size: 35 },
      { x: 450, y: 200, type: 'hexagon', size: 35 }
    ];
    
    bumperConfigs.forEach(config => {
      this.gameState.bumpers.push(config as Bumper);
      
      let body;
      if (config.type === 'circle') {
        body = MatterJS.Bodies.circle(config.x, config.y, config.size, { 
          isStatic: true, 
          restitution: 1.2 
        });
      } else if (config.type === 'triangle') {
        body = MatterJS.Bodies.polygon(config.x, config.y, 3, config.size, { 
          isStatic: true, 
          restitution: 1.1 
        });
      } else {
        body = MatterJS.Bodies.polygon(config.x, config.y, 6, config.size, { 
          isStatic: true, 
          restitution: 1.3 
        });
      }
      
      this.bumperBodies.push(body);
      MatterJS.World.add(this.matterEngine.world, body);
    });
  }

  private createObstacles() {
    this.gameState.obstacles = [];
    const lanes = [150, 250, 350, 450];
    
    lanes.forEach((y, index) => {
      const count = 2 + Math.floor(this.gameState.level * 0.5);
      for (let i = 0; i < count; i++) {
        this.gameState.obstacles.push({
          x: Math.random() * this.canvas.width,
          y,
          vx: (Math.random() - 0.5) * (2 + this.gameState.level),
          symbol: ZODIAC_PLANETS[Math.floor(Math.random() * ZODIAC_PLANETS.length)],
          lane: index
        });
      }
    });
  }

  private createGlyphs() {
    this.gameState.glyphs = [];
    const count = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < count; i++) {
      this.gameState.glyphs.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: 100 + Math.random() * 600,
        symbol: SACRED_GLYPHS[Math.floor(Math.random() * SACRED_GLYPHS.length)]
      });
    }
  }

  private drawRandomTarotCard(): TarotCard {
    const card = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    return { ...card };
  }

  launch() {
    if (!this.matterModule || !this.playerBody) return;
    
    if (!this.gameState.gameStarted) {
      this.gameState.gameStarted = true;
      this.gameState.currentTarotCard = this.drawRandomTarotCard();
      this.createObstacles();
      this.createGlyphs();
      this.applyTarotEffect(this.gameState.currentTarotCard);
    }
    
    // Make player dynamic and launch upward with velocity (not force)
    const M = this.matterModule;
    M.Body.setStatic(this.playerBody, false);
    M.Body.setVelocity(this.playerBody, { 
      x: (Math.random() - 0.5) * 3, 
      y: -15 
    });
  }

  private applyTarotEffect(card: TarotCard) {
    const now = Date.now();
    
    switch (card.effect) {
      case 'invincible':
        this.gameState.effects.push({
          type: 'invincible',
          endTime: now + (card.duration || 3000)
        });
        break;
      case 'instant_death':
        setTimeout(() => this.killPlayer(), 1000);
        break;
      case 'double_points':
        this.gameState.effects.push({
          type: 'double_points',
          endTime: now + (card.duration || 10000)
        });
        break;
      case 'free_revival':
        this.gameState.effects.push({
          type: 'free_revival',
          endTime: now + 60000 // 1 minute
        });
        break;
      case 'reversed_controls':
        this.gameState.effects.push({
          type: 'reversed_controls',
          endTime: now + (card.duration || 5000)
        });
        break;
      case 'magnet':
        this.gameState.effects.push({
          type: 'magnet',
          endTime: now + (card.duration || 8000)
        });
        break;
      case 'slow_motion':
        this.gameState.effects.push({
          type: 'slow_motion',
          endTime: now + (card.duration || 5000)
        });
        break;
      case 'random':
        const randomCard = TAROT_CARDS.filter(c => c.effect !== 'random')[
          Math.floor(Math.random() * (TAROT_CARDS.length - 1))
        ];
        this.applyTarotEffect(randomCard);
        break;
    }
  }

  private killPlayer() {
    const freeRevival = this.gameState.effects.find(e => e.type === 'free_revival');
    if (freeRevival) {
      this.gameState.effects = this.gameState.effects.filter(e => e !== freeRevival);
      return; // Free revival used
    }
    
    this.gameState.lives--;
    this.gameState.lastDeathMessage = DEATH_MESSAGES[
      Math.floor(Math.random() * DEATH_MESSAGES.length)
    ];
    this.gameState.showDeathMessage = Date.now() + 2000;
    
    // Reset player position
    if (this.playerBody && this.matterModule) {
      this.matterModule.Body.setStatic(this.playerBody, true);
      this.matterModule.Body.setPosition(this.playerBody, { x: 300, y: 750 });
      this.matterModule.Body.setVelocity(this.playerBody, { x: 0, y: 0 });
    }
    
    if (this.gameState.lives <= 0) {
      this.endGame();
    } else {
      // Draw new tarot card for next life
      this.gameState.currentTarotCard = this.drawRandomTarotCard();
      this.applyTarotEffect(this.gameState.currentTarotCard);
    }
  }

  private endGame() {
    this.gameState.gameOver = true;
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
      localStorage.setItem('137-game-high-score', this.gameState.score.toString());
    }
  }

  restart() {
    // Reset player to static
    if (this.playerBody && this.matterModule) {
      this.matterModule.Body.setStatic(this.playerBody, true);
      this.matterModule.Body.setPosition(this.playerBody, { x: 300, y: 750 });
      this.matterModule.Body.setVelocity(this.playerBody, { x: 0, y: 0 });
    }
    const savedBumpers = this.gameState.bumpers;
    this.gameState = this.createInitialState();
    this.gameState.bumpers = savedBumpers;
    this.gameState.highScore = parseInt(localStorage.getItem('137-game-high-score') || '0');
    if (this.playerBody) {
      this.playerBody.position.x = this.gameState.playerPos.x;
      this.playerBody.position.y = this.gameState.playerPos.y;
      this.playerBody.velocity.x = 0;
      this.playerBody.velocity.y = 0;
    }
  }

  update(deltaTime: number) {
    if (!this.matterEngine || !this.playerBody || this.gameState.gameOver) return;
    
    const now = Date.now();
    
    // Update Matter.js physics
    if (this.matterModule) this.matterModule.Engine.update(this.matterEngine, deltaTime);
    
    // Update player position from physics
    if (this.playerBody) {
      this.gameState.playerPos.x = this.playerBody.position.x;
      this.gameState.playerPos.y = this.playerBody.position.y;
    }
    
    // Check collisions with bumpers
    this.bumperBodies.forEach((body, index) => {
      const bumper = this.gameState.bumpers[index];
      if (!bumper) return;
      const dx = this.gameState.playerPos.x - bumper.x;
      const dy = this.gameState.playerPos.y - bumper.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < bumper.size + 15) {
        if (!bumper.hit) {
          bumper.hit = true;
          bumper.hitTime = now + 200;
          
          let points = SCORING.REGULAR_BUMPER;
          if (bumper.type === 'triangle') points = SCORING.TRIANGLE_BUMPER;
          if (bumper.type === 'hexagon') points = SCORING.HEXAGON_BUMPER;
          
          this.addScore(points);
        }
      }
      
      if (bumper.hitTime && now > bumper.hitTime) {
        bumper.hit = false;
        bumper.hitTime = undefined;
      }
    });
    
    // Update obstacles
    if (!this.gameState.playerPos) return;
    this.gameState.obstacles.forEach(obstacle => {
      if (!obstacle) return;
      obstacle.x += obstacle.vx * deltaTime / 16;
      if (obstacle.x < -30) obstacle.x = this.canvas.width + 30;
      if (obstacle.x > this.canvas.width + 30) obstacle.x = -30;
      
      // Check collision with player
      const dx = this.gameState.playerPos.x - obstacle.x;
      const dy = this.gameState.playerPos.y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 25 && !this.hasEffect('invincible')) {
        this.killPlayer();
      }
    });
    
    // Update glyphs and magnet effect
    const magnetEffect = this.gameState.effects.find(e => e.type === 'magnet');
    this.gameState.glyphs.forEach(glyph => {
      if (!glyph || glyph.collected) return;
      
      // Magnet effect
      if (magnetEffect && now < magnetEffect.endTime) {
        const dx = this.gameState.playerPos.x - glyph.x;
        const dy = this.gameState.playerPos.y - glyph.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          glyph.x += (dx / distance) * 2;
          glyph.y += (dy / distance) * 2;
        }
      }
      
      // Collection check
      const dx = this.gameState.playerPos.x - glyph.x;
      const dy = this.gameState.playerPos.y - glyph.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 20) {
        glyph.collected = true;
        this.addScore(SCORING.GLYPH_COLLECT);
      }
    });
    
    // Check if all glyphs collected
    if (this.gameState.glyphs.every(g => g.collected)) {
      this.addScore(SCORING.CIPHER_BONUS);
      this.createGlyphs(); // Create new set
    }
    
    // Check level completion (reach top)
    if (this.gameState.playerPos.y < 50) {
      this.addScore(SCORING.LEVEL_COMPLETE);
      this.gameState.level++;
      this.createObstacles();
      this.createGlyphs();
      
      // Reset player
      if (this.playerBody) {
        this.playerBody.position.x = this.gameState.playerPos.x;
        this.playerBody.position.y = this.gameState.playerPos.y;
        this.playerBody.velocity.x = 0;
        this.playerBody.velocity.y = 0;
      }
    }
    
    // Clean up expired effects
    this.gameState.effects = this.gameState.effects.filter(e => now < e.endTime);
    
    // Check if player fell off bottom
    if (this.gameState.playerPos.y > this.canvas.height + 50) {
      this.killPlayer();
    }
  }

  private addScore(points: number) {
    const multiplier = this.hasEffect('double_points') ? 2 : 1;
    const finalPoints = points * multiplier;
    this.gameState.score += finalPoints;
    
    // Check for milestone effects
    if (SCORE_MILESTONES.includes(this.gameState.score)) {
      // Flash effect handled by renderer
    }
  }

  private hasEffect(effectType: string): boolean {
    const now = Date.now();
    return this.gameState.effects.some(e => e.type === effectType && now < e.endTime);
  }

  nudge(direction: 'left' | 'right') {
    if (!this.playerBody) return;
    
    const force = 0.005;
    const reversed = this.hasEffect('reversed_controls');
    const actualDirection = reversed ? (direction === 'left' ? 'right' : 'left') : direction;
    
    this.playerBody.force = {
      x: actualDirection === 'left' ? -force : force,
      y: 0
    };
  }

  getState(): GameState {
    return { ...this.gameState };
  }

  shouldShowMilestoneFlash(): boolean {
    return SCORE_MILESTONES.includes(this.gameState.score);
  }
}
