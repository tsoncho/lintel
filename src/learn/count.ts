/** Bulgarian count form: 1 урок, 2 урока, 5 уроци, 21 урок. */
export function bgCount(n: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = Math.abs(n) % 10;
  if (mod100 < 10 || mod100 > 20) {
    if (mod10 === 1) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
  }
  return `${n} ${many}`;
}

export function formatCount(locale: "en" | "bg", n: number, forms: { one: string; few: string; many: string }): string {
  if (locale === "en") return `${n} ${n === 1 ? forms.one : forms.many}`;
  return bgCount(n, forms.one, forms.few, forms.many);
}
