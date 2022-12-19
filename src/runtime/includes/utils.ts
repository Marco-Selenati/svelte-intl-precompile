let currentLocale: string;

export function getCurrentLocale() {
  return currentLocale;
}
export function setCurrentLocale(val: string) {
  return (currentLocale = val);
}
