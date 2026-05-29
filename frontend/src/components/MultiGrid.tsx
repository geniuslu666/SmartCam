import React from 'react';
import { useI18n } from '../i18n';

interface MultiGridProps {
  streamUrls: string[];
  gridSize?: 1 | 4 | 9 | 16; // e.g., 1x1, 2x2, 3x3, 4x4
}

const MultiGrid: React.FC<MultiGridProps> = ({ streamUrls, gridSize = 4 }) => {
  const { t } = useI18n();
  const cols = Math.sqrt(gridSize);
  const gridClasses = `grid grid-cols-${cols} grid-rows-${cols} gap-1 w-full h-full`;

  return (
    <div className={gridClasses}>
      {streamUrls.slice(0, gridSize).map((url, index) => (
        <div key={index} className="w-full h-full bg-gray-900 border border-gray-700">
          {/* Placeholder for VideoPlayer component */}
          <p className="text-white text-sm text-center">{t('视频 {{number}}', { number: index + 1 })}</p>
          <p className="text-gray-400 text-xs text-center break-all">{url}</p>
        </div>
      ))}
    </div>
  );
};

export default MultiGrid;
