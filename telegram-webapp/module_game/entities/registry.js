/**
 * Entity Registry - central store for all game entities
 */

let entityIdCounter = 0;

function generateId() {
    return ++entityIdCounter;
}

// Main entity store
const entities = new Map();

export function createEntity(archetype, data = {}) {
    const id = generateId();
    const entity = {
        id,
        archetype,
        ...data,
        createdAt: Date.now()
    };
    entities.set(id, entity);
    return entity;
}

export function getEntity(id) {
    return entities.get(id);
}

export function removeEntity(id) {
    entities.delete(id);
}

export function getEntitiesByArchetype(archetype) {
    return Array.from(entities.values()).filter(e => e.archetype === archetype);
}

export function clearEntities() {
    entities.clear();
    entityIdCounter = 0;
}

export function getAllEntities() {
    return Array.from(entities.values());
}
