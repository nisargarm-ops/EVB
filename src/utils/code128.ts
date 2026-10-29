/**
 * ISO/IEC 15417 Code 128 Barcode Generator
 * Pure TypeScript, zero external dependencies.
 * Encodes alphanumeric battery serial numbers (e.g., SN-2026-NMC-25360, QV-2024-NMC-98124).
 */

export const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

export const START_CODE_B = 104;
export const STOP_CODE = 106;

export interface Code128Bar {
  x: number;
  width: number;
}

export interface Code128Encoding {
  text: string;
  checksum: number;
  totalModules: number;
  bars: Code128Bar[];
  modules: number[];
}

/**
 * Encodes text into Code 128 Subset B values and computes checksum.
 */
export function encodeCode128B(text: string, quietZone = 10): Code128Encoding {
  const values: number[] = [START_CODE_B];
  let checkSumSum = START_CODE_B;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    let val = code - 32;
    if (val < 0 || val > 95) {
      val = 0; // fallback to space
    }
    values.push(val);
    checkSumSum += (i + 1) * val;
  }

  const checksum = checkSumSum % 103;
  values.push(checksum);
  values.push(STOP_CODE);

  // Generate binary modules
  const modules: number[] = [];
  for (let q = 0; q < quietZone; q++) modules.push(0);

  for (const val of values) {
    const pattern = CODE128_PATTERNS[val];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = Number(pattern[p]);
      for (let w = 0; w < width; w++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
  }

  for (let q = 0; q < quietZone; q++) modules.push(0);

  // Group continuous 1s into bar rectangles
  const bars: Code128Bar[] = [];
  let currentStart = -1;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1) {
      if (currentStart === -1) {
        currentStart = i;
      }
    } else {
      if (currentStart !== -1) {
        bars.push({ x: currentStart, width: i - currentStart });
        currentStart = -1;
      }
    }
  }
  if (currentStart !== -1) {
    bars.push({ x: currentStart, width: modules.length - currentStart });
  }

  return {
    text,
    checksum,
    totalModules: modules.length,
    bars,
    modules,
  };
}

/**
 * Generates an SVG string representation of a Code 128 barcode.
 */
export function renderCode128SvgString(
  text: string,
  options: {
    height?: number;
    moduleWidth?: number;
    showText?: boolean;
    fontSize?: number;
    backgroundColor?: string;
    barColor?: string;
    textColor?: string;
  } = {}
): string {
  const {
    height = 60,
    moduleWidth = 2,
    showText = true,
    fontSize = 12,
    backgroundColor = '#FFFFFF',
    barColor = '#000000',
    textColor = '#14532D',
  } = options;

  const encoding = encodeCode128B(text);
  const width = encoding.totalModules * moduleWidth;
  const totalHeight = showText ? height + fontSize + 8 : height;

  const barRects = encoding.bars
    .map(
      (b) =>
        `<rect x="${b.x * moduleWidth}" y="0" width="${b.width * moduleWidth}" height="${height}" fill="${barColor}" />`
    )
    .join('');

  const textElement = showText
    ? `<text x="${width / 2}" y="${height + fontSize + 2}" font-family="ui-monospace, monospace" font-size="${fontSize}px" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="1.5px">${text}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}">
    <rect width="${width}" height="${totalHeight}" fill="${backgroundColor}" />
    ${barRects}
    ${textElement}
  </svg>`;
}

/**
 * Draws a Code 128 barcode onto an HTML5 Canvas context for high-resolution PNG export.
 */
export function drawCode128OnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    height?: number;
    moduleWidth?: number;
    showText?: boolean;
    fontSize?: number;
    barColor?: string;
    textColor?: string;
  } = {}
): { width: number; height: number } {
  const {
    height = 70,
    moduleWidth = 2,
    showText = true,
    fontSize = 14,
    barColor = '#000000',
    textColor = '#14532D',
  } = options;

  const encoding = encodeCode128B(text);
  const barcodeWidth = encoding.totalModules * moduleWidth;
  const totalHeight = showText ? height + fontSize + 10 : height;

  ctx.fillStyle = barColor;
  for (const bar of encoding.bars) {
    ctx.fillRect(x + bar.x * moduleWidth, y, bar.width * moduleWidth, height);
  }

  if (showText) {
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x + barcodeWidth / 2, y + height + fontSize + 4);
  }

  return { width: barcodeWidth, height: totalHeight };
}
