// Unit tests for game.js - Game state and utility functions
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  game,
  shieldGame,
  playSound,
  formatNum,
  saveGame,
  getSkillEffect,
  hasSkill,
  getStats,
  getMagicMultiplier,
  calculateOffline,
  setCurrentCreature,
  setCreatureHp,
  setCreatureBuffs,
  setTurnCount,
  setShieldGame,
  getCurrentCreature,
  getCreatureHp,
  getCreatureBuffs,
  isShieldGameActive
} from '../../game.js';
import { MAGIC_TYPES, SKILL_TREES, SHOP_ITEMS } from '../../data.js';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock Web Audio API
const audioContextMock = {
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { value: 440 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  createGain: vi.fn(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    connect: vi.fn()
  })),
  destination: {},
  currentTime: 0
};
globalThis.AudioContext = vi.fn(() => audioContextMock);
globalThis.webkitAudioContext = vi.fn(() => audioContextMock);

// Reset game state before each test
function resetGameState() {
  game.gold = 0;
  game.gems = 0;
  game.level = 1;
  game.floor = 1;
  game.exp = 0;
  game.expToLevel = 100;
  game.baseAtk = 10;
  game.baseDef = 5;
  game.baseHp = 100;
  game.baseCrit = 5;
  game.currentHp = 100;
  game.maxHp = 100;
  game.equipment = { wand: null, robe: null, amulet: null, book: null, relic: null };
  game.owned = [];
  game.soulGems = 0;
  game.prestigeCount = 0;
  game.skillPoints = 0;
  game.unlockedSkills = [];
  game.house = null;
  game.houseChosen = false;
  game.gameStarted = false;
  game.combo = 0;
  game.maxCombo = 0;
  game.spellCooldowns = {};
  game.poisonStacks = 0;
  game.fearDebuff = false;
  game.unlockedSpells = ['stupefy'];
  game.combatBuffs = [];
  game.combatDebuffs = [];
  game.selectingBuff = false;
  game.discoveredCreatures = [];
  game.totalKills = 0;
  game.totalGoldEarned = 0;
  game.lastOnline = Date.now();
  game.felixUsed = false;
  game.runKills = 0;
  game.runGold = 0;
  game.bestFloor = 0;
  game.inBattle = false;
  game.roomSeed = 0;
  game.lastGoldGain = 0;
  game.activeBuffs = [];
  game.buffStats = {
    atk: 0, def: 0, hp: 0, crit: 0, critDmg: 0, goldBonus: 0, xpBonus: 0,
    lifesteal: 0, regenFlat: 0, dodge: 0, thorns: 0, executeDmg: 0, spellPower: 0,
    deathSaves: 0, doubleAttack: false
  };
  game.spellTutorialDone = false;
  game.shieldTutorialDone = false;
}

describe('game.js - Game State', () => {
  beforeEach(() => {
    resetGameState();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Initial game state', () => {
    it('should have default values', () => {
      expect(game.gold).toBe(0);
      expect(game.level).toBe(1);
      expect(game.floor).toBe(1);
      expect(game.baseAtk).toBe(10);
      expect(game.baseDef).toBe(5);
      expect(game.baseHp).toBe(100);
      expect(game.baseCrit).toBe(5);
    });

    it('should have empty equipment slots', () => {
      expect(game.equipment.wand).toBeNull();
      expect(game.equipment.robe).toBeNull();
      expect(game.equipment.amulet).toBeNull();
      expect(game.equipment.book).toBeNull();
      expect(game.equipment.relic).toBeNull();
    });

    it('should have empty collections', () => {
      expect(game.owned).toEqual([]);
      expect(game.unlockedSkills).toEqual([]);
      expect(game.discoveredCreatures).toEqual([]);
      expect(game.combatBuffs).toEqual([]);
      expect(game.combatDebuffs).toEqual([]);
      expect(game.activeBuffs).toEqual([]);
    });

    it('should have starting spell', () => {
      expect(game.unlockedSpells).toContain('stupefy');
    });
  });

  describe('Battle state setters/getters', () => {
    it('should set and get current creature', () => {
      const creature = { name: 'Test', hp: 100 };
      setCurrentCreature(creature);
      expect(getCurrentCreature()).toEqual(creature);
    });

    it('should set and get creature HP', () => {
      setCreatureHp(50);
      expect(getCreatureHp()).toBe(50);
    });

    it('should set and get creature buffs', () => {
      const buffs = { shield: true };
      setCreatureBuffs(buffs);
      expect(getCreatureBuffs()).toEqual(buffs);
    });

    it('should track shield game active state', () => {
      expect(isShieldGameActive()).toBe(false);
      setShieldGame({ active: true, currentColor: null });
      expect(isShieldGameActive()).toBe(true);
    });
  });
});

describe('game.js - Utility Functions', () => {
  beforeEach(() => {
    resetGameState();
    vi.clearAllMocks();
  });

  describe('formatNum', () => {
    it('should format numbers under 1000 as integers', () => {
      expect(formatNum(0)).toBe(0);
      expect(formatNum(100)).toBe(100);
      expect(formatNum(999)).toBe(999);
      expect(formatNum(500.5)).toBe(500);
    });

    it('should format thousands with K suffix', () => {
      expect(formatNum(1000)).toBe('1.0K');
      expect(formatNum(1500)).toBe('1.5K');
      expect(formatNum(10000)).toBe('10.0K');
      expect(formatNum(999999)).toBe('1000.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatNum(1000000)).toBe('1.0M');
      expect(formatNum(1500000)).toBe('1.5M');
      expect(formatNum(10000000)).toBe('10.0M');
    });
  });

  describe('saveGame', () => {
    it('should save game state to localStorage', () => {
      game.gold = 100;
      game.level = 5;
      saveGame();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'wizardDuels',
        expect.any(String)
      );
    });

    it('should update lastOnline timestamp', () => {
      const before = Date.now();
      saveGame();
      const after = Date.now();

      expect(game.lastOnline).toBeGreaterThanOrEqual(before);
      expect(game.lastOnline).toBeLessThanOrEqual(after);
    });

    it('should serialize game state as JSON', () => {
      game.gold = 500;
      saveGame();

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.gold).toBe(500);
    });
  });

  describe('playSound', () => {
    it('should create audio context on first call', () => {
      playSound(440, 'sine', 0.1);
      expect(globalThis.AudioContext).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      // Should not throw
      expect(() => playSound(440)).not.toThrow();
    });
  });
});

describe('game.js - Skill System', () => {
  beforeEach(() => {
    resetGameState();
  });

  describe('getSkillEffect', () => {
    it('should return null when no skills unlocked', () => {
      game.unlockedSkills = [];
      expect(getSkillEffect('spellDamage')).toBeNull();
    });

    it('should return effect value when skill is unlocked', () => {
      // Unlock lumos skill from charms tree
      game.unlockedSkills = ['lumos'];
      const effect = getSkillEffect('spellDamage');
      expect(effect).toBe(0.5); // Lumos gives +50% spell damage
    });

    it('should return null for non-existent effect', () => {
      game.unlockedSkills = ['lumos'];
      expect(getSkillEffect('nonExistentEffect')).toBeNull();
    });
  });

  describe('hasSkill', () => {
    it('should return false when skill not unlocked', () => {
      game.unlockedSkills = [];
      expect(hasSkill('spellDamage')).toBe(false);
    });

    it('should return true when skill effect exists', () => {
      game.unlockedSkills = ['lumos'];
      expect(hasSkill('spellDamage')).toBe(true);
    });
  });
});

describe('game.js - Stats Calculation', () => {
  beforeEach(() => {
    resetGameState();
  });

  describe('getStats - base stats', () => {
    it('should return base stats at level 1', () => {
      game.level = 1;
      const stats = getStats();

      expect(stats.atk).toBe(10);
      expect(stats.def).toBe(5);
      expect(stats.hp).toBe(100);
      expect(stats.crit).toBe(5);
    });

    it('should scale stats with level', () => {
      game.level = 10;
      const stats = getStats();

      // Level scaling: +2 atk, +1 def, +10 hp per level
      expect(stats.atk).toBe(10 + (10 - 1) * 2); // 28
      expect(stats.def).toBe(5 + (10 - 1) * 1); // 14
      expect(stats.hp).toBe(100 + (10 - 1) * 10); // 190
    });
  });

  describe('getStats - equipment bonuses', () => {
    it('should add equipment stats', () => {
      // Equip Oak Wand (+5 atk)
      game.owned = ['wand1'];
      game.equipment.wand = 'wand1';
      const stats = getStats();

      expect(stats.atk).toBe(15); // 10 base + 5 from wand
    });

    it('should apply multiple equipment bonuses', () => {
      // Equip wand (+5 atk) and robe (+5 def, +20 hp)
      game.owned = ['wand1', 'robe1'];
      game.equipment.wand = 'wand1';
      game.equipment.robe = 'robe1';
      const stats = getStats();

      expect(stats.atk).toBe(15);
      expect(stats.def).toBe(10);
      expect(stats.hp).toBe(120);
    });

    it('should track wand magic type', () => {
      // Equip Phoenix Wand (has CHARMS magic)
      game.owned = ['wand2'];
      game.equipment.wand = 'wand2';
      const stats = getStats();

      expect(stats.wandMagic).toBe('CHARMS');
    });

    it('should default to NONE magic without magic wand', () => {
      game.owned = ['wand1'];
      game.equipment.wand = 'wand1'; // Oak wand has no magic
      const stats = getStats();

      expect(stats.wandMagic).toBe('NONE');
    });
  });

  describe('getStats - house bonuses', () => {
    it('should apply Gryffindor bonuses (+20% atk, -10% def)', () => {
      game.house = 'gryffindor';
      const stats = getStats();

      expect(stats.atk).toBe(Math.floor(10 * 1.2)); // 12
      expect(stats.def).toBe(Math.floor(5 * 0.9)); // 4
    });

    it('should apply Slytherin bonuses (+10% atk, +5% crit)', () => {
      game.house = 'slytherin';
      const stats = getStats();

      expect(stats.atk).toBe(Math.floor(10 * 1.1)); // 11
      expect(stats.crit).toBe(5 + 5); // 10
    });

    it('should apply Ravenclaw bonuses (+8% crit, +20% xp)', () => {
      game.house = 'ravenclaw';
      const stats = getStats();

      expect(stats.crit).toBe(5 + 8); // 13
      expect(stats.xpBonus).toBe(0.2);
    });

    it('should apply Hufflepuff bonuses (+15% hp, +10% def)', () => {
      game.house = 'hufflepuff';
      const stats = getStats();

      expect(stats.hp).toBe(Math.floor(100 * 1.15)); // 115
      expect(stats.def).toBe(Math.floor(5 * 1.1)); // 5
    });
  });

  describe('getStats - buff stats', () => {
    it('should add buff stats to totals', () => {
      game.buffStats.atk = 10;
      game.buffStats.def = 5;
      game.buffStats.hp = 50;
      game.buffStats.crit = 3;

      const stats = getStats();

      expect(stats.atk).toBe(20); // 10 + 10
      expect(stats.def).toBe(10); // 5 + 5
      expect(stats.hp).toBe(150); // 100 + 50
      expect(stats.crit).toBe(8); // 5 + 3
    });

    it('should include special buff stats', () => {
      game.buffStats.lifesteal = 0.1;
      game.buffStats.dodge = 10;
      game.buffStats.thorns = 0.15;
      game.buffStats.critDmg = 0.5;

      const stats = getStats();

      expect(stats.lifesteal).toBe(0.1);
      expect(stats.dodge).toBe(10);
      expect(stats.thorns).toBe(0.15);
      expect(stats.critDmg).toBe(1.5); // 1 + 0.5
    });
  });

  describe('getStats - fear debuff', () => {
    it('should reduce attack when feared', () => {
      game.fearDebuff = true;
      const stats = getStats();

      expect(stats.atk).toBe(Math.floor(10 * 0.7)); // 7
    });

    it('should not reduce attack when fear immune', () => {
      game.fearDebuff = true;
      game.unlockedSkills = ['imperio']; // Fear immunity skill

      const stats = getStats();
      expect(stats.atk).toBe(10); // No reduction
    });
  });
});

describe('game.js - Magic Multiplier', () => {
  describe('getMagicMultiplier', () => {
    it('should return 1 for same type', () => {
      expect(getMagicMultiplier('CHARMS', 'CHARMS')).toBe(1);
      expect(getMagicMultiplier('DARK', 'DARK')).toBe(1);
    });

    it('should return 1.5 for advantageous matchup', () => {
      expect(getMagicMultiplier('CHARMS', 'CREATURES')).toBe(1.5); // CHARMS beats CREATURES
      expect(getMagicMultiplier('DARK', 'CHARMS')).toBe(1.5);
      expect(getMagicMultiplier('DEFENSE', 'DARK')).toBe(1.5);
      expect(getMagicMultiplier('CREATURES', 'DEFENSE')).toBe(1.5);
    });

    it('should return 0.6 for disadvantageous matchup', () => {
      expect(getMagicMultiplier('CHARMS', 'DARK')).toBe(0.6); // CHARMS weakTo DARK
      expect(getMagicMultiplier('DARK', 'DEFENSE')).toBe(0.6);
      expect(getMagicMultiplier('DEFENSE', 'CREATURES')).toBe(0.6);
      expect(getMagicMultiplier('CREATURES', 'CHARMS')).toBe(0.6);
    });

    it('should return 1 for neutral types', () => {
      expect(getMagicMultiplier('NONE', 'CHARMS')).toBe(1);
      expect(getMagicMultiplier('TRANSFIG', 'DARK')).toBe(1);
      expect(getMagicMultiplier('CHARMS', 'NONE')).toBe(1);
    });

    it('should return 1 for invalid types', () => {
      expect(getMagicMultiplier('INVALID', 'CHARMS')).toBe(1);
      expect(getMagicMultiplier('CHARMS', 'INVALID')).toBe(1);
    });
  });
});

describe('game.js - Offline Progression', () => {
  beforeEach(() => {
    resetGameState();
  });

  describe('calculateOffline', () => {
    it('should return null for less than 60 seconds offline', () => {
      game.lastOnline = Date.now() - 30000; // 30 seconds ago
      expect(calculateOffline()).toBeNull();
    });

    it('should calculate gold for time offline', () => {
      game.lastOnline = Date.now() - 120000; // 2 minutes ago
      game.floor = 1;
      const rewards = calculateOffline();

      expect(rewards).not.toBeNull();
      expect(rewards.gold).toBeGreaterThan(0);
    });

    it('should cap offline time at 8 hours', () => {
      game.lastOnline = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
      game.floor = 1;
      const rewards = calculateOffline();

      // Calculate expected max gold (8 hours = 28800 seconds)
      const maxSeconds = 8 * 60 * 60;
      const expectedMaxGold = Math.floor(maxSeconds * 0.3 * (5 + 1 * 2));

      expect(rewards.gold).toBeLessThanOrEqual(expectedMaxGold);
    });

    it('should scale gold with floor', () => {
      game.lastOnline = Date.now() - 300000; // 5 minutes ago

      game.floor = 1;
      const rewardsFloor1 = calculateOffline();

      game.floor = 10;
      const rewardsFloor10 = calculateOffline();

      expect(rewardsFloor10.gold).toBeGreaterThan(rewardsFloor1.gold);
    });
  });
});

describe('game.js - Shield Game State', () => {
  beforeEach(() => {
    resetGameState();
    // Reset shield game state since it's a module-level variable
    setShieldGame({
      active: false,
      currentColor: null,
      timeLeft: 0,
      timerInterval: null,
      isTutorial: false,
      bossSpellQueue: [],
      spellsBlocked: 0,
      spellsMissed: 0
    });
  });

  it('should have default shield game state after reset', () => {
    expect(shieldGame.active).toBe(false);
    expect(shieldGame.currentColor).toBeNull();
    expect(shieldGame.bossSpellQueue).toEqual([]);
    expect(shieldGame.spellsBlocked).toBe(0);
    expect(shieldGame.spellsMissed).toBe(0);
  });

  it('should update shield game state with setter', () => {
    setShieldGame({
      active: true,
      currentColor: 'red',
      bossSpellQueue: ['red', 'blue'],
      spellsBlocked: 1,
      spellsMissed: 0
    });

    expect(isShieldGameActive()).toBe(true);
  });
});
