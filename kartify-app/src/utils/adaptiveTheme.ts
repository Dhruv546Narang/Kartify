export interface AdaptivePalette {
  isDay: boolean;
  bgTop: string;
  bgBottom: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
}

export function getAdaptivePalette(isDay: boolean): AdaptivePalette {
  if (isDay) {
    return {
      isDay: true,
      bgTop: '#eff6f1',
      bgBottom: '#dceadf',
      surface: '#f5faf6',
      surfaceAlt: '#e8f1ea',
      border: '#c7ddcc',
      text: '#1f3a2e',
      textMuted: '#53705f',
      accent: '#7ca982',
      accentSoft: '#d2e5d5',
    };
  }

  return {
    isDay: false,
    bgTop: '#102018',
    bgBottom: '#0a1611',
    surface: '#183127',
    surfaceAlt: '#13271f',
    border: '#315244',
    text: '#e8f4eb',
    textMuted: '#9ebaa7',
    accent: '#7fae86',
    accentSoft: '#274436',
  };
}

export function isDayTime(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 6 && hour < 19;
}
