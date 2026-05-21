/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { EfToggle, EfSlider } from '../../ui/ef-ui';
import Loading from '../convert/components/loading';
import './setting-page.css';

const DATE_FORMATS = [
  '2001/01/01 01:01:01',
  '2001-01-01 01:01:01',
  '2001年01月01日 01時01分',
  '2001년 01월 01일 01시 01분',
  '2001/01/01',
  '2001-01-01',
  '2001年01月01日',
  '2001년 01월 01일',
  'Jan 1, 2001',
];

const ExportSettingsPage = () => {
  const { t } = useTranslation();
  const store = useStore();
  const {
    darkMode, setDarkMode,
    exportToJpeg, setExportToJpeg,
    quality, setQuality,
    maintainExif, setMaintainExif,
    focalLength35mmMode, setFocalLength35mmMode,
    disableExposureMeter, setDisableExposureMeter,
    fixImageWidth, setFixImageWidth,
    showCameraMaker, setShowCameraMaker,
    showCameraModel, setShowCameraModel,
    showLensModel, setShowLensModel,
    notCroppedMode, setNotCroppedMode,
    dateNotation, setDateNotation,
  } = store;

  return (
    <div className="ef-settings">
      <header className="ef-settings__header">
        <h1>{t('root.settings') || '설정'}</h1>
      </header>

      {/* ── Appearance ───────────────────────────────────── */}
      <Section title="외형">
        <Row
          title="다크 모드"
          subtitle="앱과 미리보기 배경의 톤"
          control={<EfToggle value={darkMode} onChange={setDarkMode} />}
        />
      </Section>

      {/* ── Export ──────────────────────────────────────── */}
      <Section title="내보내기">
        <Row
          title="JPEG로 저장"
          subtitle="끄면 WebP — 더 작은 용량"
          control={<EfToggle value={exportToJpeg} onChange={setExportToJpeg} />}
        />
        <Row
          title="EXIF 유지"
          subtitle="결과 이미지에 원본 EXIF 포함"
          control={<EfToggle value={maintainExif} onChange={setMaintainExif} />}
        />
        <Row
          title={`품질 ${quality}`}
          subtitle="JPEG/WebP 압축 품질"
          control={
            <div style={{ flex: 1, maxWidth: 200 }}>
              <EfSlider value={quality} min={1} max={100} step={1} onChange={setQuality} />
            </div>
          }
          stack
        />
        <Row
          title="이미지 폭 고정"
          subtitle="긴 면을 고정 폭으로 리사이즈"
          control={<EfToggle value={fixImageWidth} onChange={setFixImageWidth} />}
        />
      </Section>

      {/* ── EXIF / Frame behavior ───────────────────────── */}
      <Section title="EXIF 표시">
        <Row
          title="35mm 환산 초점거리"
          subtitle="크롭 바디 화각을 풀프레임 기준으로 표시"
          control={<EfToggle value={focalLength35mmMode} onChange={setFocalLength35mmMode} />}
        />
        <Row
          title="노출 정보 숨김"
          subtitle="조리개/셔터/ISO를 표시하지 않음"
          control={<EfToggle value={disableExposureMeter} onChange={setDisableExposureMeter} />}
        />
        <Row
          title="카메라 제조사 표시"
          control={<EfToggle value={showCameraMaker} onChange={setShowCameraMaker} />}
        />
        <Row
          title="카메라 모델 표시"
          control={<EfToggle value={showCameraModel} onChange={setShowCameraModel} />}
        />
        <Row
          title="렌즈 모델 표시"
          control={<EfToggle value={showLensModel} onChange={setShowLensModel} />}
        />
      </Section>

      <Section title="날짜 표기">
        <Row
          title="형식"
          subtitle="EXIF 날짜를 표시할 때 사용하는 형식"
          control={
            <select
              className="ef-settings__select"
              value={dateNotation}
              onChange={(e) => setDateNotation(e.target.value)}
            >
              {DATE_FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          }
          stack
        />
      </Section>

      <Section title="크롭">
        <Row
          title="크롭하지 않음"
          subtitle="원본 비율 유지 (테마가 비율을 강제하지 않음)"
          control={<EfToggle value={notCroppedMode} onChange={setNotCroppedMode} />}
        />
      </Section>

      <Section title="정보">
        <Row title="이름" subtitle="EXIF Frame (noname009 fork)" />
        <Row title="원작자" subtitle="jeonghyeon-net (rhea-so)" />
        <Row
          title="원본 소스"
          subtitle="github.com/jeonghyeon-net/exif-frame"
          onClick={() => window.open('https://github.com/jeonghyeon-net/exif-frame', '_blank')}
        />
        <Row
          title="이 포크의 소스"
          subtitle="github.com/noname009/exif-frame"
          onClick={() => window.open('https://github.com/noname009/exif-frame', '_blank')}
        />
        <Row title="라이센스" subtitle="GNU General Public License v3.0 (GPL-3.0)" />
        <Row
          title="라이센스 전문"
          subtitle="GPL-3.0 보기"
          onClick={() => window.open('https://www.gnu.org/licenses/gpl-3.0.html', '_blank')}
        />
      </Section>

      <Loading />
    </div>
  );
};

/* ── Helpers ────────────────────────────────────────────── */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="ef-settings__section">
    <div className="ef-settings__section-title">{title}</div>
    <div className="ef-settings__rows">{children}</div>
  </section>
);

const Row = ({
  title, subtitle, control, stack, onClick,
}: {
  title: string;
  subtitle?: string;
  control?: React.ReactNode;
  stack?: boolean;
  onClick?: () => void;
}) => {
  const className = `ef-settings__row${stack ? ' ef-settings__row--stack' : ''}${onClick ? ' ef-settings__row--clickable' : ''}`;
  const content = (
    <>
      <div className="ef-settings__row-text">
        <div className="ef-settings__row-title">{title}</div>
        {subtitle && <div className="ef-settings__row-subtitle">{subtitle}</div>}
      </div>
      {control && <div className="ef-settings__row-control">{control}</div>}
    </>
  );
  if (onClick) {
    return <button type="button" className={className} onClick={onClick}>{content}</button>;
  }
  return <div className={className}>{content}</div>;
};

export default ExportSettingsPage;