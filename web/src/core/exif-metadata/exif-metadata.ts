/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

import { Tags } from 'exifreader';

class ExifMetadata {
  public make: string | undefined;
  public model: string | undefined;
  public lensModel: string | undefined;
  public focalLength: string | undefined;
  public focalLengthIn35mm: string | undefined;
  public fNumber: string | undefined;
  public iso: string | undefined;
  public exposureTime: string | undefined;
  public exposureBias: string | undefined;
  public thumbnail: string | undefined;
  public takenAt: string | undefined;

  constructor(metadata: Tags) {
    this.make = metadata?.Make?.description;
    this.model = metadata?.Model?.description;
    this.lensModel = this.model ? metadata?.LensModel?.description?.replace(this.model, '')?.trim() : metadata?.LensModel?.description;
    this.focalLength = metadata?.FocalLength?.description?.replace(' mm', 'mm');
    this.focalLengthIn35mm = metadata?.FocalLengthIn35mmFilm?.value
      ? `${metadata?.FocalLengthIn35mmFilm?.value}mm`
      : metadata?.UprightFocalLength35mm?.value
      ? metadata.UprightFocalLength35mm.value.includes('.')
        ? `${metadata.UprightFocalLength35mm.value.split('.').shift()}mm`
        : `${metadata.UprightFocalLength35mm.value}mm`
      : undefined;
    this.fNumber = metadata?.FNumber?.description?.substring(0, 5)?.replace('f/', 'F');
    this.iso = metadata?.ISOSpeedRatings?.value ? 'ISO' + metadata?.ISOSpeedRatings?.value?.toString() : undefined;
    this.exposureTime = metadata?.ExposureTime?.description ? metadata?.ExposureTime?.description + 's' : undefined;

    // 노출 보정: ExposureBiasValue 또는 ExposureCompensation 필드
    // ExifReader는 description으로 "−1/3 EV" 같은 문자열을 주거나 value로 숫자 배열([numerator, denominator])을 줌.
    // 가장 간결한 형식 "-0.3", "+1", "0"으로 정규화.
    const ebTag = metadata?.ExposureBiasValue || (metadata as unknown as Record<string, { value: unknown; description: string }>)?.ExposureCompensation;
    if (ebTag) {
      let raw: number | undefined;
      const val = ebTag.value;
      if (Array.isArray(val) && val.length === 2 && typeof val[0] === 'number' && typeof val[1] === 'number' && val[1] !== 0) {
        raw = val[0] / val[1];
      } else if (typeof val === 'number') {
        raw = val;
      } else if (typeof ebTag.description === 'string') {
        // description에서 숫자 추출 시도 ("+1/3" 같은 형식 포함)
        const m = ebTag.description.match(/-?\d+(\.\d+)?(\s*\/\s*\d+)?/);
        if (m) {
          if (m[0].includes('/')) {
            const [n, d] = m[0].split('/').map((s) => parseFloat(s.trim()));
            if (d) raw = n / d;
          } else {
            raw = parseFloat(m[0]);
          }
        }
      }
      if (raw !== undefined && Number.isFinite(raw)) {
        // 소수점 한 자리로 반올림. 0이면 "0", 양수면 "+1.0" 형식.
        const rounded = Math.round(raw * 10) / 10;
        if (rounded === 0) this.exposureBias = '0';
        else if (rounded > 0) this.exposureBias = `+${rounded}`;
        else this.exposureBias = `${rounded}`;
      }
    }

    this.thumbnail = metadata?.Thumbnail?.base64 ? 'data:image/jpg;base64,' + metadata?.Thumbnail?.base64 : undefined;

    if (metadata?.DateTimeOriginal?.description) {
      const yyyymmdd = metadata.DateTimeOriginal.description.split(' ')[0].split(':').join('-');
      const hhmmss = metadata.DateTimeOriginal.description.split(' ')[1];
      this.takenAt = `${yyyymmdd} ${hhmmss}`;
    }
  }
}

export default ExifMetadata;
