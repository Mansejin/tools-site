const PALETTE = [
  '#C45C26',
  '#2F6F6A',
  '#3D5A80',
  '#B44D6A',
  '#6B4E71',
  '#8B6914',
  '#2E7D4F',
  '#A63D2F',
  '#4A6FA5',
  '#7A5C3A',
];

export function roleColorAt(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function shortNameFrom(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (/^[A-Za-z]/.test(trimmed)) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  return trimmed.slice(0, 1);
}
