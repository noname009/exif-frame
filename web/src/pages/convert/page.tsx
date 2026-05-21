/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import Photo from '../../core/photo';
import themes from '../../themes';
import render from '../../core/drawing/render';
import free from '../../core/drawing/free';
import convert from '../../core/drawing/convert';
import download from '../../core/file-system/download';
import compress from '../../core/file-system/compress';
import Customize from '../theme/database/customize';
import { ThemeOptionInput, getConverter } from '../theme/types/theme-option';
import OverrideMetadataPopup from './components/override-metadata.popup';
import AddPhotoErrorDialog from './components/add-photo-error.dialog';
import Loading from './components/loading';
import { EfIconButton, EfButton } from '../../ui/ef-ui';
import './convert-page.css';

const FramePage = () => {
  const store = useStore();
  const { photos, setPhotos, selectedThemeName, setLoading, setOpenedAddPhotoErrorDialog,
    exportToJpeg, quality } = store;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (photos.length === 0) { setSelectedIdx(0); return; }
    if (selectedIdx >= photos.length) setSelectedIdx(photos.length - 1);
  }, [photos.length, selectedIdx]);

  useEffect(() => {
    if (photos.length === 0) return;
    const photo = photos[selectedIdx];
    if (!photo) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const theme = themes.find((t) => t.name === selectedThemeName);
    if (!theme) return;
    const input: ThemeOptionInput = new Map();
    theme.options.forEach((opt) => {
      const v = Customize.get(selectedThemeName, opt.id, getConverter(opt.type));
      input.set(opt.id, v ?? opt.default);
    });

    let cancelled = false;
    render(theme.func, photo, input, store).then((rendered) => {
      if (cancelled) { free(rendered); return; }
      drawCanvasIntoPreview(rendered, canvas);
      free(rendered);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, selectedIdx, selectedThemeName, store.rerenderOptions, store.darkMode]);

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const newPhotos = await Promise.all(Array.from(files).map(Photo.create));
      setPhotos([...photos, ...newPhotos]);
      if (photos.length === 0) setSelectedIdx(0);
    } catch (e) {
      console.error(e);
      setOpenedAddPhotoErrorDialog(true);
    }
    setLoading(false);
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    addPhotos(e.target.files);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    addPhotos(e.dataTransfer.files);
  }

  async function downloadCurrent() {
    if (photos.length === 0) return;
    const photo = photos[selectedIdx];
    const theme = themes.find((t) => t.name === selectedThemeName);
    if (!theme) return;
    setLoading(true);
    try {
      const input: ThemeOptionInput = new Map();
      theme.options.forEach((opt) => {
        const v = Customize.get(selectedThemeName, opt.id, getConverter(opt.type));
        input.set(opt.id, v ?? opt.default);
      });
      const canvas = await render(theme.func, photo, input, store);
      const data = await convert(canvas, {
        type: exportToJpeg ? 'image/jpeg' : 'image/webp',
        quality,
      });
      free(canvas);
      const filename = photo.file.name.replace(/\.[^.]+$/, '') + (exportToJpeg ? '.jpg' : '.webp');
      await download(filename, data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function downloadAll() {
    if (photos.length === 0) return;
    const theme = themes.find((t) => t.name === selectedThemeName);
    if (!theme) return;
    setLoading(true);
    try {
      const input: ThemeOptionInput = new Map();
      theme.options.forEach((opt) => {
        const v = Customize.get(selectedThemeName, opt.id, getConverter(opt.type));
        input.set(opt.id, v ?? opt.default);
      });
      const files: { filename: string; data: string }[] = [];
      for (const photo of photos) {
        const canvas = await render(theme.func, photo, input, store);
        const data = await convert(canvas, {
          type: exportToJpeg ? 'image/jpeg' : 'image/webp',
          quality,
        });
        free(canvas);
        files.push({
          filename: photo.file.name.replace(/\.[^.]+$/, '') + (exportToJpeg ? '.jpg' : '.webp'),
          data,
        });
      }
      const zipBase64 = await compress(files);
      await download('exif-frame.zip', zipBase64);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function removePhoto(idx: number) {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    if (selectedIdx >= next.length) setSelectedIdx(Math.max(0, next.length - 1));
  }

  const hasPhotos = photos.length > 0;
  const current = hasPhotos ? photos[selectedIdx] : null;

  return (
    <div className="ef-convert" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <input id="ef-file-input" type="file" accept="image/*" multiple hidden onChange={onFileInput} />

      <header className="ef-convert__topbar">
        <EfIconButton
          icon={<PlusIcon />}
          variant="ghost"
          label="추가"
          onClick={() => document.getElementById('ef-file-input')?.click()}
        />
        <div className="ef-convert__title">
          <div className="ef-convert__title-eyebrow">테마</div>
          <div className="ef-convert__title-main">{selectedThemeName}</div>
        </div>
        <div className="ef-convert__topbar-actions">
          <EfIconButton
            icon={<DownloadIcon />}
            variant="ghost"
            disabled={!hasPhotos}
            label="현재 사진"
            onClick={downloadCurrent}
          />
          <EfIconButton
            icon={<DownloadAllIcon />}
            variant="ghost"
            disabled={photos.length < 2}
            label="전체 ZIP"
            onClick={downloadAll}
          />
        </div>
      </header>

      <main className="ef-convert__preview">
        {hasPhotos
          ? <canvas ref={previewCanvasRef} className="ef-convert__canvas" />
          : <EmptyState onAdd={() => document.getElementById('ef-file-input')?.click()} />}
      </main>

      {current && (
        <div className="ef-convert__exif-bar">
          <span className="ef-convert__exif-name">{current.file.name}</span>
          <span className="ef-convert__exif-meta">
            {[current.metadata.focalLength, current.metadata.fNumber,
              current.metadata.exposureTime, current.metadata.iso].filter(Boolean).join('  ·  ')}
          </span>
        </div>
      )}

      {hasPhotos && (
        <footer className="ef-convert__strip ef-scroll">
          {photos.map((photo, idx) => (
            <PhotoThumb
              key={idx}
              photo={photo}
              selected={idx === selectedIdx}
              onClick={() => setSelectedIdx(idx)}
              onRemove={() => removePhoto(idx)}
            />
          ))}
          <button
            type="button"
            className="ef-convert__add-tile"
            onClick={() => document.getElementById('ef-file-input')?.click()}
            aria-label="사진 추가"
          >
            <PlusIcon />
          </button>
        </footer>
      )}

      <OverrideMetadataPopup />
      <AddPhotoErrorDialog />
      <Loading />
    </div>
  );
};

const PhotoThumb = ({ photo, selected, onClick, onRemove }: {
  photo: Photo;
  selected: boolean;
  onClick: () => void;
  onRemove: () => void;
}) => (
  <div className={`ef-thumb${selected ? ' ef-thumb--selected' : ''}`}>
    <button type="button" className="ef-thumb__btn" onClick={onClick}>
      <img src={photo.thumbnail} alt={photo.file.name} />
    </button>
    {selected && (
      <button type="button" className="ef-thumb__close" onClick={onRemove} aria-label="제거">
        <CloseIcon />
      </button>
    )}
  </div>
);

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="ef-empty">
    <div className="ef-empty__icon"><PhotoLargeIcon /></div>
    <h2 className="ef-empty__title">사진을 추가하세요</h2>
    <p className="ef-empty__hint">이미지를 끌어놓거나 버튼을 눌러 시작</p>
    <EfButton variant="accent" size="lg" onClick={onAdd} icon={<PlusIcon />}>
      사진 가져오기
    </EfButton>
  </div>
);

function drawCanvasIntoPreview(src: HTMLCanvasElement, dst: HTMLCanvasElement) {
  const parent = dst.parentElement;
  if (!parent) return;
  const containerW = parent.clientWidth;
  const containerH = parent.clientHeight;
  if (containerW === 0 || containerH === 0) return;

  const srcRatio = src.width / src.height;
  const containerRatio = containerW / containerH;
  let drawW: number, drawH: number;
  if (srcRatio > containerRatio) {
    drawW = containerW;
    drawH = containerW / srcRatio;
  } else {
    drawH = containerH;
    drawW = containerH * srcRatio;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  dst.width = Math.round(drawW * dpr);
  dst.height = Math.round(drawH * dpr);
  dst.style.width = `${drawW}px`;
  dst.style.height = `${drawH}px`;
  const ctx = dst.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, dst.width, dst.height);
}

function PlusIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
}
function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
}
function DownloadIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>;
}
function DownloadAllIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17 14v4m0 0l-2-2m2 2l2-2"/></svg>;
}
function PhotoLargeIcon() {
  return <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 16l-5-5L7 19"/></svg>;
}

export default FramePage;