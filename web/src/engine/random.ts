export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const randomItem = <T>(items: T[]): T => {
  return items[randomInt(0, items.length - 1)];
}

export const createId = (prefix = "id"): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}