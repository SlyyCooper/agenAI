import { FC, ChangeEvent } from 'react';
import { Tone } from '@/types/interfaces/api.types';

interface ToneSelectorProps {
  tone: Tone;
  onToneChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

const ToneSelector: FC<ToneSelectorProps> = ({ tone, onToneChange }) => {
  return (
    <div className="form-group">
      <label htmlFor="tone" className="block text-sm font-medium">
        Tone
      </label>
      <select
        id="tone"
        name="tone"
        value={tone}
        onChange={onToneChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
      >
        <option value="balanced">Balanced</option>
        <option value="formal">Formal</option>
        <option value="casual">Casual</option>
        <option value="professional">Professional</option>
        <option value="academic">Academic</option>
      </select>
    </div>
  );
};

export default ToneSelector; 