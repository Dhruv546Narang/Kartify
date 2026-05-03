/**
 * Platform brand colors for badges and visual identification
 */
export const platformColors: Record<string, string> = {
  blinkit: '#F7CB46',
  zepto: '#7B2FF2',
  instamart: '#FC8019',
  bigbasket: '#84C225',
  jiomart: '#0078AD',
  default: '#6ea474',
};

export const getPlatformColor = (platform: string): string => {
  return platformColors[platform.toLowerCase()] || platformColors.default;
};
