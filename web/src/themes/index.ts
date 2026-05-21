/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

import { create } from 'zustand';
import { NO_FRAME_THEME_FUNC, NO_FRAME_OPTIONS } from './01_NO_FRAME';
import { ONE_LINE_FUNC, ONE_LINE_OPTIONS } from './03_ONE_LINE';
import { TWO_LINE_FUNC, TWO_LINE_OPTIONS } from './04_TWO_LINE';
import { JUST_FRAME_FUNC, JUST_FRAME_OPTIONS } from './02_JUST_FRAME';
import { STRAP_FUNC, STRAP_OPTIONS } from './07_STRAP';
import { SHOT_ON_ONE_LINE_FUNC, SHOT_ON_ONE_LINE_OPTIONS } from './05_SHOT_ON_ONE_LINE';
import { SHOT_ON_TWO_LINE_FUNC, SHOT_ON_TWO_LINE_OPTIONS } from './06_SHOT_ON_TWO_LINE';
import { FILM_FUNC, FILM_OPTIONS } from './08_FILM';
import { MONITOR_FUNC, MONITOR_OPTIONS } from './09_MONITOR';
import { LIGHTROOM_FUNC, LIGHTROOM_OPTIONS } from './10_LIGHTROOM';
import { CUSTOM_ONE_LINE_FUNC, CUSTOM_ONE_LINE_OPTIONS } from './11_CUSTOM_ONE_LINE';
import { CUSTOM_TWO_LINE_FUNC, CUSTOM_TWO_LINE_OPTIONS } from './12_CUSTOM_TWO_LINE';
import { TIP_FUNC, TIP_OPTIONS } from './13_TIP';
import { POSTER_FUNC, POSTER_OPTIONS } from './14_POSTER';
import { CINEMASCOPE_FUNC, CINEMASCOPE_OPTIONS } from './15_CINEMASCOPE';
import { SIMPLE_FUNC, SIMPLE_OPTIONS } from './16_SIMPLE';
import { HISTOGRAM_FUNC, HISTOGRAM_OPTIONS } from './17_HISTOGRAM';
import { GALLERY_CARD_FUNC, GALLERY_CARD_OPTIONS } from './18_GALLERY_CARD';
import { MODERN_OVERLAY_FUNC, MODERN_OVERLAY_OPTIONS } from './19_MODERN_OVERLAY';
import { POSTCARD_FUNC, POSTCARD_OPTIONS } from './20_POSTCARD';
import { OVERLAY_CARD_FUNC, OVERLAY_CARD_OPTIONS } from './21_OVERLAY_CARD';
import { GRID_FUNC, GRID_OPTIONS } from './27_ARCHITECTURE_GRID';

type AcceptInputType = string | number | boolean;

type ThemeStore = {
  option: Map<string, AcceptInputType>;
  setOption: (key: string, value: AcceptInputType) => void;
  clearOption: () => void;
};

const useThemeStore = create<ThemeStore>((set) => ({
  option: localStorage.getItem('option') ? new Map(JSON.parse(localStorage.getItem('option') as string)) : new Map(),
  setOption: (key, value) => {
    set((state) => {
      state.option.set(key, value);
      localStorage.setItem('option', JSON.stringify(Array.from(state.option.entries())));
      return state;
    });
  },
  clearOption: () => {
    set((state) => {
      state.option.clear();
      localStorage.removeItem('option');
      return state;
    });
  },
}));

const themes = [
  { name: 'No frame', func: NO_FRAME_THEME_FUNC, options: NO_FRAME_OPTIONS },
  { name: 'Just frame', func: JUST_FRAME_FUNC, options: JUST_FRAME_OPTIONS },
  { name: 'Simple', func: SIMPLE_FUNC, options: SIMPLE_OPTIONS },
  { name: 'Strap', func: STRAP_FUNC, options: STRAP_OPTIONS },
  { name: 'One line', func: ONE_LINE_FUNC, options: ONE_LINE_OPTIONS },
  { name: 'Two line', func: TWO_LINE_FUNC, options: TWO_LINE_OPTIONS },
  { name: 'Shot on one line', func: SHOT_ON_ONE_LINE_FUNC, options: SHOT_ON_ONE_LINE_OPTIONS },
  { name: 'Shot on two line', func: SHOT_ON_TWO_LINE_FUNC, options: SHOT_ON_TWO_LINE_OPTIONS },
  { name: 'Film', func: FILM_FUNC, options: FILM_OPTIONS },
  { name: 'Monitor', func: MONITOR_FUNC, options: MONITOR_OPTIONS },
  { name: 'Lightroom', func: LIGHTROOM_FUNC, options: LIGHTROOM_OPTIONS },
  { name: 'Custom One Line', func: CUSTOM_ONE_LINE_FUNC, options: CUSTOM_ONE_LINE_OPTIONS },
  { name: 'Custom Two Line', func: CUSTOM_TWO_LINE_FUNC, options: CUSTOM_TWO_LINE_OPTIONS },
  { name: 'Poster', func: POSTER_FUNC, options: POSTER_OPTIONS },
  { name: 'Tip', func: TIP_FUNC, options: TIP_OPTIONS },
  { name: 'Cinema Scope', func: CINEMASCOPE_FUNC, options: CINEMASCOPE_OPTIONS },
  { name: 'Histogram', func: HISTOGRAM_FUNC, options: HISTOGRAM_OPTIONS },
  { name: 'Modern Strap', func: MODERN_OVERLAY_FUNC, options: MODERN_OVERLAY_OPTIONS },
  { name: 'Gallery Card', func: GALLERY_CARD_FUNC, options: GALLERY_CARD_OPTIONS },
  { name: 'Postcard', func: POSTCARD_FUNC, options: POSTCARD_OPTIONS },
  { name: 'Overlay Card', func: OVERLAY_CARD_FUNC, options: OVERLAY_CARD_OPTIONS },
  { name: 'Architecture Grid', func: GRID_FUNC, options: GRID_OPTIONS },
];

export default themes;
export { useThemeStore };