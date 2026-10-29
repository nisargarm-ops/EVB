import React from 'react';
import { encodeCode128B } from '../utils/code128';

interface Barcode128Props {
  serialNumber: string;
  id?: string;
  height?: number;
  moduleWidth?: number;
  showText?: boolean;
  fontSize?: number;
  barColor?: string;
  textColor?: string;
  className?: string;
}

export const Barcode128: React.FC<Barcode128Props> = ({
  serialNumber,
  id = 'barcode-128-svg',
  height = 55,
  moduleWidth = 2,
  showText = true,
  fontSize = 12,
  barColor = '#000000',
  textColor = '#14532D',
  className = '',
}) => {
  const encoding = encodeCode128B(serialNumber);
  const width = encoding.totalModules * moduleWidth;
  const totalHeight = showText ? height + fontSize + 10 : height;

  return (
    <svg
      id={id}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${totalHeight}`}
      className={`w-full max-w-[320px] h-auto select-none ${className}`}
      style={{ shapeRendering: 'crispEdges' }}
      aria-label={`Code 128 Barcode for Serial ${serialNumber}`}
    >
      <rect width={width} height={totalHeight} fill="#FFFFFF" />
      {encoding.bars.map((bar, idx) => (
        <rect
          key={idx}
          x={bar.x * moduleWidth}
          y={0}
          width={bar.width * moduleWidth}
          height={height}
          fill={barColor}
        />
      ))}
      {showText && (
        <text
          x={width / 2}
          y={height + fontSize + 4}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          fontSize={`${fontSize}px`}
          fontWeight="bold"
          fill={textColor}
          textAnchor="middle"
          letterSpacing="1px"
        >
          {serialNumber}
        </text>
      )}
    </svg>
  );
};
