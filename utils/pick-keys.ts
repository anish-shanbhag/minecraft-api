export function pickKeys<T>(object: T, keys?: (keyof T)[] | null): Partial<T> {
  return keys
    ? keys.reduce(
        (filtered, key) => ({
          ...filtered,
          ...(object[key] !== undefined && { [key]: object[key] }),
        }),
        {}
      )
    : object;
}
