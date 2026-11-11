// Zeitpunkte für Menschen in deutscher Schreibweise (04.11.2026).

const FORM = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export const datum = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : FORM.format(d);
};
