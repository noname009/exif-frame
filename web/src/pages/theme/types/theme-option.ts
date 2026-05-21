/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

type StringOption = {
  type: 'string';
  default: string;
};

type NumberOption = {
  type: 'number';
  default: number;
};

type BooleanOption = {
  type: 'boolean';
  default: boolean;
};

type SelectOption = {
  type: 'select';
  default: string;
  options: string[];
};

type RangeSliderOption = {
  type: 'range-slider';
  default: number;
  min: number;
  max: number;
  step: number;
};

type ColorOption = {
  type: 'color';
  default: string;
};

type ThemeOption = (StringOption | NumberOption | BooleanOption | SelectOption | RangeSliderOption | ColorOption) & {
  id: string;
  description?: string;
  /** 사용자에게 보일 친화적 이름. 없으면 id 사용. (17번 이후 신규 테마에만 사용) */
  label?: string;
  /** 옵션을 묶는 그룹 이름. 그룹이 있으면 UI가 접을 수 있는 섹션으로 묶음. */
  group?: string;
  /** 같은 row 값을 가진 옵션들끼리 같은 가로 행에 배치된다 (sheet 기반 옵션 전용). */
  row?: string;
};

type ThemeOptionInput = Map<string, string | number | boolean>;

const getConverter = (type: string): typeof String | typeof Number | typeof Boolean => {
  switch (type) {
    case 'string':
    case 'select':
    case 'color':
      return String;

    case 'number':
    case 'range-slider':
      return Number;

    case 'boolean':
      return Boolean;

    default:
      throw new Error(`Unknown type: ${type}`);
  }
};

export { getConverter };
export type { ThemeOption, ThemeOptionInput };