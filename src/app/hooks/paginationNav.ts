// Registry bridging keyboard page-flips to the existing DialogPagination
// handlers (which own the slide animation, wrap-around and "place" sound).

type PaginationHandlers = { prev: () => void; next: () => void };

const registry = new Map<string, PaginationHandlers>();

export const paginationNav = {
    register(key: string, handlers: PaginationHandlers) {
        registry.set(key, handlers);
    },

    unregister(key: string) {
        registry.delete(key);
    },

    flip(key: string, direction: "prev" | "next") {
        const handlers = registry.get(key);
        if (!handlers) return false;
        handlers[direction]();
        return true;
    },
};
