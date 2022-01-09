export function filterByFields<T extends Record<string, any>>(array: T[], fields: Partial<T>) {
  return array.filter((element) =>
    Object.keys(fields).every((field) => element[field] === fields[field])
  );
}
