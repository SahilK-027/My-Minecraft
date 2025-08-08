import themesData from '../Themes/theme.json';

export function getThemeConfig(themeName) {
  const theme = themesData.themes[themeName];
  if (!theme) {
    throw new Error(`Theme '${themeName}' not found in themes.json`);
  }

  return {
    sky_color: theme.skyColor,
    fog_color: theme.fogColor,
    fog_start: theme.fogStart,
    fog_end: theme.fogEnd,
    horizon_accent: theme.horizonAccent,
  };
}
