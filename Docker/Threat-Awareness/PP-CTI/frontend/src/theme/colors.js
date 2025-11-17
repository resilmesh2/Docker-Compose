/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
 *
 * See LICENSE file in the project root for details.
 */

// Color palette and CSS variable registration

// Named color constants based on perceived hue/tone
export const midnightIndigo = '#0B233E';
export const steelSlate = '#3C4F65';
export const stormGray = '#6D7B8B';
export const mistBlueGray = '#9DA7B2';
export const fogSilver = '#CED3D8';


export const inkNavy = '#142B3A';
export const deepTeal = '#295675';
export const oceanBlue = '#3D80B0';
export const skyAzure = '#51ABEA';
export const lightSky = '#74BCEE';
export const paleSky = '#97CDF2';
export const babyBlue = '#B9DDF7';
export const iceBlue = '#DCEEFB';

// Map of semantic names to hex values for convenient iteration
export const colors = {
  midnightIndigo,
  steelSlate,
  stormGray,
  mistBlueGray,
  fogSilver,
  inkNavy,
  deepTeal,
  oceanBlue,
  skyAzure,
  lightSky,
  paleSky,
  babyBlue,
  iceBlue,
};

// Register CSS variables on :root for use in stylesheets
export function registerColorCssVariables(targetDocument = typeof document !== 'undefined' ? document : null) {
  if (!targetDocument) return;
  const root = targetDocument.documentElement;
  Object.entries(colors).forEach(([name, value]) => {
    root.style.setProperty(`--color-${name}`, value);
  });
}

export default colors;


