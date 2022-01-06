export const sortByKey = (array: any[], key: string) => {
  array.sort((a, b) => {
    return a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
  });
};
