/**
 * Event Bus - decoupled communication between systems
 */

const eventListeners = new Map();

export function emit(event, data) {
    const listeners = eventListeners.get(event) || [];
    listeners.forEach(fn => fn(data));
}

export function on(event, callback) {
    if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
    }
    eventListeners.get(event).push(callback);
}

export function off(event, callback) {
    const listeners = eventListeners.get(event);
    if (listeners) {
        const idx = listeners.indexOf(callback);
        if (idx >= 0) listeners.splice(idx, 1);
    }
}

export function clearEvents() {
    eventListeners.clear();
}
