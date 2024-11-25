import { Slider } from '@/components/ui/slider';

interface ParameterControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
  warning?: string;
}

export const ParameterControl: React.FC<ParameterControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = '',
  warning
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm">
        {label}: {value.toFixed(2)}{suffix}
        {warning && <span className="text-red-500 ml-2">{warning}</span>}
      </label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([newValue]) => onChange(newValue)}
      />
    </div>
  );
};
