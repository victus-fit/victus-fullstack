import { Compass } from 'lucide-react';

export function CompassMark() {
  return (
    <div className="compass-mark" aria-label="Victus compass mark">
      <Compass size={21} strokeWidth={1.8} />
    </div>
  );
}
