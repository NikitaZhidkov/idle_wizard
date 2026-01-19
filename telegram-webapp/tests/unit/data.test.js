// Unit tests for data.js - Game constants and data structures
import { describe, it, expect } from 'vitest';
import {
  SPRITE_CELL, SPRITE_BORDER, SPRITE_SIZE,
  MAGIC_TYPES, ABILITIES, CREATURES, BOSSES,
  SPELLS, SKILL_TREES, SHOP_ITEMS, ROOM_THEMES,
  BUFFS, SHIELD_COLORS, SPELL_VISUALS
} from '../../data.js';

describe('data.js - Constants', () => {
  describe('Sprite Configuration', () => {
    it('should have valid sprite dimensions', () => {
      expect(SPRITE_CELL).toBe(125);
      expect(SPRITE_BORDER).toBe(4);
      expect(SPRITE_SIZE).toBe(117);
    });

    it('should have consistent sprite math (cell - border*2 ≈ size)', () => {
      // Sprite size should be close to cell - 2*border
      const expectedSize = SPRITE_CELL - SPRITE_BORDER * 2;
      expect(SPRITE_SIZE).toBe(expectedSize);
    });
  });

  describe('MAGIC_TYPES', () => {
    it('should have all 6 magic types defined', () => {
      const expectedTypes = ['CHARMS', 'DARK', 'DEFENSE', 'CREATURES', 'TRANSFIG', 'NONE'];
      expect(Object.keys(MAGIC_TYPES)).toEqual(expect.arrayContaining(expectedTypes));
      expect(Object.keys(MAGIC_TYPES)).toHaveLength(6);
    });

    it('should have required properties for each magic type', () => {
      Object.entries(MAGIC_TYPES).forEach(([key, type]) => {
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('icon');
        expect(type).toHaveProperty('color');
        expect(type).toHaveProperty('beats');
        expect(type).toHaveProperty('weakTo');
        expect(typeof type.name).toBe('string');
        expect(typeof type.color).toBe('string');
      });
    });

    it('should have valid rock-paper-scissors relationships', () => {
      // CHARMS beats CREATURES, weakTo DARK
      expect(MAGIC_TYPES.CHARMS.beats).toBe('CREATURES');
      expect(MAGIC_TYPES.CHARMS.weakTo).toBe('DARK');

      // DARK beats CHARMS, weakTo DEFENSE
      expect(MAGIC_TYPES.DARK.beats).toBe('CHARMS');
      expect(MAGIC_TYPES.DARK.weakTo).toBe('DEFENSE');

      // DEFENSE beats DARK, weakTo CREATURES
      expect(MAGIC_TYPES.DEFENSE.beats).toBe('DARK');
      expect(MAGIC_TYPES.DEFENSE.weakTo).toBe('CREATURES');

      // CREATURES beats DEFENSE, weakTo CHARMS
      expect(MAGIC_TYPES.CREATURES.beats).toBe('DEFENSE');
      expect(MAGIC_TYPES.CREATURES.weakTo).toBe('CHARMS');
    });

    it('should have neutral types without advantages', () => {
      expect(MAGIC_TYPES.TRANSFIG.beats).toBeNull();
      expect(MAGIC_TYPES.TRANSFIG.weakTo).toBeNull();
      expect(MAGIC_TYPES.NONE.beats).toBeNull();
      expect(MAGIC_TYPES.NONE.weakTo).toBeNull();
    });
  });

  describe('ABILITIES', () => {
    it('should have all 8 creature abilities', () => {
      const expectedAbilities = ['REGEN', 'SHIELD', 'RAGE', 'POISON', 'DODGE', 'REFLECT', 'DISARM', 'FEAR'];
      expect(Object.keys(ABILITIES)).toEqual(expect.arrayContaining(expectedAbilities));
      expect(Object.keys(ABILITIES)).toHaveLength(8);
    });

    it('should have required properties for each ability', () => {
      Object.entries(ABILITIES).forEach(([key, ability]) => {
        expect(ability).toHaveProperty('name');
        expect(ability).toHaveProperty('icon');
        expect(ability).toHaveProperty('desc');
        expect(typeof ability.name).toBe('string');
        expect(typeof ability.icon).toBe('string');
        expect(typeof ability.desc).toBe('string');
      });
    });
  });

  describe('CREATURES', () => {
    it('should have 11 base creatures', () => {
      expect(CREATURES).toHaveLength(11);
    });

    it('should have valid creature structures', () => {
      CREATURES.forEach(creature => {
        expect(creature).toHaveProperty('name');
        expect(creature).toHaveProperty('icon');
        expect(creature).toHaveProperty('magic');
        expect(creature).toHaveProperty('hp');
        expect(creature).toHaveProperty('atk');
        expect(creature).toHaveProperty('gold');
        expect(creature).toHaveProperty('abilities');
        expect(creature).toHaveProperty('spriteX');
        expect(creature).toHaveProperty('spriteY');

        // Validate types
        expect(typeof creature.name).toBe('string');
        expect(typeof creature.hp).toBe('number');
        expect(typeof creature.atk).toBe('number');
        expect(typeof creature.gold).toBe('number');
        expect(Array.isArray(creature.abilities)).toBe(true);
        expect(Object.keys(MAGIC_TYPES)).toContain(creature.magic);
      });
    });

    it('should have valid abilities referencing ABILITIES', () => {
      CREATURES.forEach(creature => {
        creature.abilities.forEach(ability => {
          expect(Object.keys(ABILITIES)).toContain(ability);
        });
      });
    });

    it('should have increasing difficulty (generally)', () => {
      // First creature should have lower stats than last
      const first = CREATURES[0];
      const last = CREATURES[CREATURES.length - 1];
      expect(last.hp).toBeGreaterThan(first.hp);
      expect(last.atk).toBeGreaterThan(first.atk);
    });

    it('should have valid sprite positions within 4x4 grid', () => {
      CREATURES.forEach(creature => {
        expect(creature.spriteX).toBeGreaterThanOrEqual(0);
        expect(creature.spriteX).toBeLessThan(4);
        expect(creature.spriteY).toBeGreaterThanOrEqual(0);
        expect(creature.spriteY).toBeLessThan(4);
      });
    });
  });

  describe('BOSSES', () => {
    it('should have 4 bosses', () => {
      expect(BOSSES).toHaveLength(4);
    });

    it('should have boss flag set to true', () => {
      BOSSES.forEach(boss => {
        expect(boss.boss).toBe(true);
      });
    });

    it('should have stronger stats than regular creatures', () => {
      const strongestCreature = CREATURES.reduce((max, c) => c.hp > max.hp ? c : max);
      const weakestBoss = BOSSES.reduce((min, b) => b.hp < min.hp ? b : min);

      // Weakest boss should be comparable or stronger than strongest creature
      expect(weakestBoss.hp).toBeGreaterThanOrEqual(strongestCreature.hp * 0.8);
    });

    it('should have valid boss names', () => {
      const expectedBosses = ['Troll', 'Death Eater', 'Nagini', 'Voldemort'];
      const bossNames = BOSSES.map(b => b.name);
      expect(bossNames).toEqual(expect.arrayContaining(expectedBosses));
    });
  });

  describe('SPELLS', () => {
    it('should have at least 15 spells', () => {
      expect(SPELLS.length).toBeGreaterThanOrEqual(15);
    });

    it('should have required properties for each spell', () => {
      SPELLS.forEach(spell => {
        expect(spell).toHaveProperty('id');
        expect(spell).toHaveProperty('name');
        expect(spell).toHaveProperty('icon');
        expect(spell).toHaveProperty('cooldown');
        expect(spell).toHaveProperty('magic');
        expect(spell).toHaveProperty('desc');
        expect(spell).toHaveProperty('color');

        expect(typeof spell.id).toBe('string');
        expect(typeof spell.cooldown).toBe('number');
        expect(spell.cooldown).toBeGreaterThan(0);
        expect(Object.keys(MAGIC_TYPES)).toContain(spell.magic);
      });
    });

    it('should have unique spell IDs', () => {
      const ids = SPELLS.map(s => s.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have house starter spells', () => {
      const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
      houses.forEach(house => {
        const houseSpell = SPELLS.find(s => s.house === house);
        expect(houseSpell).toBeDefined();
        expect(houseSpell.locked).toBeUndefined(); // Starter spells are not locked
      });
    });

    it('should have healing spells with heal property', () => {
      const healingSpells = SPELLS.filter(s => s.heal);
      expect(healingSpells.length).toBeGreaterThan(0);
      healingSpells.forEach(spell => {
        expect(spell.heal).toBeGreaterThan(0);
        expect(spell.heal).toBeLessThanOrEqual(1); // Heal is a percentage
      });
    });

    it('should have damage spells with damage property', () => {
      const damageSpells = SPELLS.filter(s => s.damage && s.damage > 0);
      expect(damageSpells.length).toBeGreaterThan(0);
    });
  });

  describe('SKILL_TREES', () => {
    it('should have 3 skill trees', () => {
      expect(Object.keys(SKILL_TREES)).toHaveLength(3);
    });

    it('should have charms, darkarts, and defense trees', () => {
      expect(SKILL_TREES).toHaveProperty('charms');
      expect(SKILL_TREES).toHaveProperty('darkarts');
      expect(SKILL_TREES).toHaveProperty('defense');
    });

    it('should have valid tree structures', () => {
      Object.values(SKILL_TREES).forEach(tree => {
        expect(tree).toHaveProperty('name');
        expect(tree).toHaveProperty('icon');
        expect(tree).toHaveProperty('color');
        expect(tree).toHaveProperty('skills');
        expect(Array.isArray(tree.skills)).toBe(true);
        expect(tree.skills.length).toBeGreaterThan(0);
      });
    });

    it('should have skills with valid prerequisite chains', () => {
      Object.values(SKILL_TREES).forEach(tree => {
        const skillIds = tree.skills.map(s => s.id);
        tree.skills.forEach(skill => {
          if (skill.requires) {
            expect(skillIds).toContain(skill.requires);
          }
          expect(skill).toHaveProperty('id');
          expect(skill).toHaveProperty('name');
          expect(skill).toHaveProperty('cost');
          expect(skill).toHaveProperty('effect');
          expect(skill.cost).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('SHOP_ITEMS', () => {
    it('should have items', () => {
      expect(SHOP_ITEMS.length).toBeGreaterThan(0);
    });

    it('should have valid item structures', () => {
      SHOP_ITEMS.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('price');

        expect(typeof item.id).toBe('string');
        expect(typeof item.price).toBe('number');
        expect(item.price).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have different item types', () => {
      const types = [...new Set(SHOP_ITEMS.map(i => i.type))];
      expect(types).toContain('wand');
      expect(types).toContain('robe');
      expect(types).toContain('amulet');
      expect(types).toContain('book');
      expect(types).toContain('relic');
    });

    it('should have house-exclusive relics', () => {
      const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
      houses.forEach(house => {
        const relic = SHOP_ITEMS.find(i => i.house === house && i.type === 'relic');
        expect(relic).toBeDefined();
        expect(relic.price).toBe(0); // Relics are free (given at start)
      });
    });

    it('should have unique item IDs', () => {
      const ids = SHOP_ITEMS.map(i => i.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('ROOM_THEMES', () => {
    it('should have multiple room themes', () => {
      expect(ROOM_THEMES.length).toBeGreaterThan(0);
    });

    it('should have valid theme structures', () => {
      ROOM_THEMES.forEach(theme => {
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('bg');
        expect(theme).toHaveProperty('ground');
        expect(theme).toHaveProperty('decor');
        expect(theme).toHaveProperty('particles');

        expect(Array.isArray(theme.bg)).toBe(true);
        expect(theme.bg).toHaveLength(2); // gradient colors
        expect(Array.isArray(theme.decor)).toBe(true);
        expect(theme.decor.length).toBeGreaterThan(0);
      });
    });
  });

  describe('BUFFS', () => {
    it('should have buffs of different rarities', () => {
      const rarities = [...new Set(BUFFS.map(b => b.rarity))];
      expect(rarities).toContain('common');
      expect(rarities).toContain('rare');
      expect(rarities).toContain('epic');
      expect(rarities).toContain('legendary');
    });

    it('should have valid buff structures', () => {
      BUFFS.forEach(buff => {
        expect(buff).toHaveProperty('id');
        expect(buff).toHaveProperty('name');
        expect(buff).toHaveProperty('icon');
        expect(buff).toHaveProperty('rarity');
        expect(buff).toHaveProperty('desc');
        expect(buff).toHaveProperty('stats');
        expect(buff).toHaveProperty('effect');

        expect(typeof buff.effect).toBe('object');
      });
    });

    it('should have unique buff IDs', () => {
      const ids = BUFFS.map(b => b.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have spell unlock buffs', () => {
      const spellUnlocks = BUFFS.filter(b => b.effect.unlockSpell);
      expect(spellUnlocks.length).toBeGreaterThan(0);
    });
  });

  describe('SHIELD_COLORS', () => {
    it('should have 4 shield colors', () => {
      expect(Object.keys(SHIELD_COLORS)).toHaveLength(4);
    });

    it('should have red, blue, yellow, green', () => {
      expect(SHIELD_COLORS).toHaveProperty('red');
      expect(SHIELD_COLORS).toHaveProperty('blue');
      expect(SHIELD_COLORS).toHaveProperty('yellow');
      expect(SHIELD_COLORS).toHaveProperty('green');
    });

    it('should have valid shield color structures', () => {
      Object.values(SHIELD_COLORS).forEach(color => {
        expect(color).toHaveProperty('icon');
        expect(color).toHaveProperty('name');
        expect(color).toHaveProperty('spellIcon');
      });
    });
  });

  describe('SPELL_VISUALS', () => {
    it('should have visual icons for spell types', () => {
      expect(Object.keys(SPELL_VISUALS).length).toBeGreaterThan(0);
    });

    it('should have visual for common spell effects', () => {
      expect(SPELL_VISUALS).toHaveProperty('fire');
      expect(SPELL_VISUALS).toHaveProperty('ice');
      expect(SPELL_VISUALS).toHaveProperty('heal');
      expect(SPELL_VISUALS).toHaveProperty('shield');
    });
  });
});
