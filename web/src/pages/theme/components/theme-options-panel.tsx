/*
 * Copyright (C) 2026 noname009 (https://github.com/noname009)
 *
 * This file is part of a modified fork of EXIF Frame
 * (original: https://github.com/jeonghyeon-net/exif-frame).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../../store';
import Customize from '../database/customize';
import { ThemeOption, getConverter } from '../types/theme-option';
import './theme-options-panel.css';

/**
 * Options panel — iOS Settings 스타일.
 *
 * 같은 그룹의 옵션들이 둥근 카드 안에 행 단위로 묶임. 토글/슬라이더/칩은
 * 행 안에서 인라인. 키보드 필요한 입력은 행을 누르면 모달 시트가 열림.
 */

type Props = { options: readonly ThemeOption[]; themeName: string };

const ThemeOptionsPanel = ({ options, themeName }: Props) => {
  const [sheetOption, setSheetOption] = useState<ThemeOption | null>(null);

  const groupOrder: string[] = [];
  const grouped: Record<string, ThemeOption[]> = {};
  for (const opt of options) {
    const g = opt.group ?? '';
    if (!grouped[g]) { grouped[g] = []; groupOrder.push(g); }
    grouped[g].push(opt);
  }

  return (
    <>
      <div className="ef-opt">
        {groupOrder.map((g) => (
          <section key={g} className="ef-opt__group">
            {g && <h3 className="ef-opt__group-title">{g}</h3>}
            <div className="ef-opt__card">
              {renderRows(grouped[g], themeName, setSheetOption)}
            </div>
          </section>
        ))}
      </div>

      {sheetOption && (
        <InputSheet
          option={sheetOption}
          themeName={themeName}
          onClose={() => setSheetOption(null)}
        />
      )}
    </>
  );
};

/** 같은 `row` 키를 가진 인접 옵션들은 한 가로 행으로 묶어 그린다. */
function renderRows(opts: ThemeOption[], themeName: string, onEdit: (o: ThemeOption) => void) {
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < opts.length) {
    const opt = opts[i];
    // 같은 row를 공유하는 인접 옵션들 모으기
    if (opt.row) {
      const group: ThemeOption[] = [opt];
      let j = i + 1;
      while (j < opts.length && opts[j].row === opt.row) {
        group.push(opts[j]);
        j++;
      }
      // 그룹의 모든 옵션이 sheet 기반인지 (인라인 슬라이더/토글이 섞이면 안 됨)
      const allSheet = group.every((o) =>
        !(o.type === 'boolean' || o.type === 'range-slider' ||
          (o.type === 'select' && o.options.length <= 4))
      );
      const isLastBlock = j === opts.length;
      if (allSheet && group.length >= 2) {
        out.push(
          <div key={opt.row + i} className={`ef-row ef-row--multi${isLastBlock ? ' ef-row--last' : ''}`}>
            {group.map((o) => (
              <SubCell key={o.id} option={o} themeName={themeName} onEdit={() => onEdit(o)} />
            ))}
          </div>
        );
        i = j;
        continue;
      }
      // sheet 그룹이 아니면 그냥 하나씩
    }

    out.push(
      <OptionRow
        key={opt.id}
        option={opt}
        themeName={themeName}
        isLast={i === opts.length - 1}
        onEdit={() => onEdit(opt)}
      />
    );
    i++;
  }
  return out;
}

/** Multi-row 내부의 작은 셀 — 라벨 + 값 미리보기를 세로로 쌓아 표시 */
const SubCell = ({ option, themeName, onEdit }: {
  option: ThemeOption; themeName: string; onEdit: () => void;
}) => {
  const { rerenderOptions } = useStore();
  const [value, setValue] = useState(
    Customize.get(themeName, option.id, getConverter(option.type)) ?? option.default,
  );
  useEffect(() => {
    setValue(Customize.get(themeName, option.id, getConverter(option.type)) ?? option.default);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeName, rerenderOptions]);

  const label = option.label || option.id;
  return (
    <button type="button" className="ef-subcell" onClick={onEdit}>
      <div className="ef-subcell__label">{label}</div>
      <div className="ef-subcell__value">
        {renderRowValue(option, value)}
      </div>
    </button>
  );
};

const OptionRow = ({ option, themeName, isLast, onEdit }: {
  option: ThemeOption; themeName: string; isLast: boolean; onEdit: () => void;
}) => {
  const { rerenderOptions, setRerenderOptions } = useStore();
  const [value, setValue] = useState(
    Customize.get(themeName, option.id, getConverter(option.type)) ?? option.default,
  );

  useEffect(() => {
    setValue(Customize.get(themeName, option.id, getConverter(option.type)) ?? option.default);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeName, rerenderOptions]);

  const label = option.label || option.id;

  const isInline =
    option.type === 'boolean' ||
    option.type === 'range-slider' ||
    (option.type === 'select' && option.options.length <= 4);

  const debounceRef = useRef<number | null>(null);
  function commitInline(v: unknown) {
    Customize.set(themeName, option.id, v as string | number | boolean);
    setValue(v as never);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setRerenderOptions();
      debounceRef.current = null;
    }, 250);
  }

  const rowClass = `ef-row${isLast ? ' ef-row--last' : ''}`;

  if (!isInline) {
    return (
      <button type="button" className={`${rowClass} ef-row--clickable`} onClick={onEdit}>
        <div className="ef-row__label">{label}</div>
        <div className="ef-row__value">
          {renderRowValue(option, value)}
          <ChevronIcon />
        </div>
      </button>
    );
  }

  if (option.type === 'boolean') {
    return (
      <div className={rowClass}>
        <div className="ef-row__label">{label}</div>
        <BooleanWidget value={value as boolean} onChange={commitInline} />
      </div>
    );
  }

  if (option.type === 'range-slider') {
    return (
      <div className={`${rowClass} ef-row--stack`}>
        <div className="ef-row__top">
          <div className="ef-row__label">{label}</div>
          <span className="ef-row__num">{formatNum(value as number)}</span>
        </div>
        <RangeWidget
          value={value as number}
          min={option.min}
          max={option.max}
          step={option.step}
          onChange={commitInline}
        />
      </div>
    );
  }

  if (option.type === 'select') {
    return (
      <div className={`${rowClass} ef-row--stack`}>
        <div className="ef-row__label">{label}</div>
        <ChipsSelectWidget
          value={value as string}
          options={option.options}
          onChange={commitInline}
        />
      </div>
    );
  }

  return null;
};

function renderRowValue(option: ThemeOption, value: unknown) {
  if (option.type === 'color') {
    const v = String(value);
    return (
      <span className="ef-row__color-val">
        <span className="ef-row__swatch" style={{ background: v }} />
        <span className="ef-row__mono">{v.toUpperCase()}</span>
      </span>
    );
  }
  if (option.type === 'number') {
    return <span className="ef-row__mono">{String(value)}</span>;
  }
  if (option.type === 'string') {
    const s = String(value);
    return (
      <span className="ef-row__text">
        {s.length === 0 ? <em className="ef-row__placeholder">비어있음</em> : s.split('\n').join(' ↵ ')}
      </span>
    );
  }
  if (option.type === 'select') {
    return <span className="ef-row__text">{String(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

/* ── Input sheet ──────────────────────────────────────── */

const InputSheet = ({ option, themeName, onClose }: {
  option: ThemeOption; themeName: string; onClose: () => void;
}) => {
  const { setRerenderOptions } = useStore();
  const initial = Customize.get(themeName, option.id, getConverter(option.type)) ?? option.default;
  const [draft, setDraft] = useState<string | number>(initial as string | number);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function save() {
    let v: string | number | boolean = draft;
    if (option.type === 'number') {
      v = typeof draft === 'number' ? draft : parseFloat(String(draft)) || 0;
    }
    Customize.set(themeName, option.id, v);
    setRerenderOptions();
    onClose();
  }

  function reset() {
    Customize.delete(themeName, option.id);
    setRerenderOptions();
    onClose();
  }

  const label = option.label || option.id;

  return (
    <div className="ef-sheet-overlay" onClick={onClose}>
      <div className="ef-sheet-card" onClick={(e) => e.stopPropagation()} role="dialog">
        <header className="ef-sheet-card__header">
          <button type="button" className="ef-sheet-card__btn ef-sheet-card__btn--cancel" onClick={onClose}>취소</button>
          <div className="ef-sheet-card__title">{label}</div>
          <button type="button" className="ef-sheet-card__btn ef-sheet-card__btn--save" onClick={save}>완료</button>
        </header>

        <div className="ef-sheet-card__body">
          {option.type === 'string' && (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              className="ef-sheet-card__textarea"
              value={String(draft)}
              rows={5}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={option.description || ''}
            />
          )}

          {option.type === 'number' && (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="number"
              inputMode="decimal"
              className="ef-sheet-card__input"
              value={String(draft)}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}

          {option.type === 'color' && (
            <ColorPickerBody value={String(draft)} onChange={setDraft} />
          )}

          {option.type === 'select' && (
            <SelectListBody
              value={String(draft)}
              options={(option as Extract<ThemeOption, { type: 'select' }>).options}
              onChange={setDraft}
            />
          )}

          {option.description && <div className="ef-sheet-card__hint">{option.description}</div>}
        </div>

        <footer className="ef-sheet-card__footer">
          <button type="button" className="ef-sheet-card__reset" onClick={reset}>기본값으로 되돌리기</button>
        </footer>
      </div>
    </div>
  );
};

const ColorPickerBody = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const presets = ['#000000', '#FFFFFF', '#F0ECE4', '#1A1A1A', '#3D3D3D',
    '#666666', '#999999', '#CCCCCC', '#E74C3C', '#E8A64A',
    '#3ECF6F', '#4A90E2', '#9B59B6', '#16A085', '#2C3E50'];
  return (
    <div>
      <div className="ef-color-preview" style={{ background: value }}>
        <span className="ef-color-preview__hex">{value.toUpperCase()}</span>
      </div>
      <input type="color" className="ef-color-native" value={value} onChange={(e) => onChange(e.target.value)} />
      <input type="text" className="ef-sheet-card__input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" style={{ marginTop: 12 }} />
      <div className="ef-color-presets">
        {presets.map((c) => (
          <button key={c} type="button" className={`ef-color-preset${value.toUpperCase() === c.toUpperCase() ? ' is-active' : ''}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
        ))}
      </div>
    </div>
  );
};

const SelectListBody = ({ value, options, onChange }: {
  value: string; options: readonly string[]; onChange: (v: string) => void;
}) => (
  <div className="ef-select-list">
    {options.map((o) => (
      <button key={o} type="button" className={`ef-select-list__item${value === o ? ' is-active' : ''}`} onClick={() => onChange(o)}>
        <span>{o}</span>
        {value === o && <CheckIcon />}
      </button>
    ))}
  </div>
);

const BooleanWidget = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" className={`ef-toggle${value ? ' ef-toggle--on' : ''}`} onClick={() => onChange(!value)} aria-pressed={value}>
    <span className="ef-toggle__thumb" />
  </button>
);

const RangeWidget = ({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <input type="range" className="ef-row-range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
);

const ChipsSelectWidget = ({ value, options, onChange }: {
  value: string; options: readonly string[]; onChange: (v: string) => void;
}) => (
  <div className="ef-chips">
    {options.map((o) => (
      <button key={o} type="button" className={`ef-chip${value === o ? ' ef-chip--on' : ''}`} onClick={() => onChange(o)}>{o}</button>
    ))}
  </div>
);

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ef-row__chevron">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function formatNum(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export default ThemeOptionsPanel;