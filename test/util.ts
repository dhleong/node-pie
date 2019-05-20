export function toList<T>(iterable: Iterable<T>) {
    const list = [];

    for (const item of iterable) {
        list.push(item);
    }

    return list;
}
