// packages/utils/src/cn.ts
type ClassValue = string | boolean | undefined | null | ClassValue[];

export function cn(...classes: ClassValue[]): string {
  return classes
    .flat(Infinity as 1)
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .join(' ');
}
