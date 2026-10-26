import type { ComponentType } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import SegmentedControlClass, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';
import { useColors } from '@/core/theme';

// The package's class typings predate React 19's JSX types; its runtime is a normal native component.
const SegmentedControl = SegmentedControlClass as unknown as ComponentType<SegmentedControlProps>;

/** Native UISegmentedControl. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  return (
    <SegmentedControl
      accessibilityLabel={accessibilityLabel}
      values={options.map((o) => o.label)}
      selectedIndex={Math.max(
        0,
        options.findIndex((o) => o.value === value),
      )}
      onChange={(e) => {
        const next = options[e.nativeEvent.selectedSegmentIndex];
        if (next && next.value !== value) onChange(next.value);
      }}
      style={styles.segmented}
    />
  );
}

/** Native UISwitch tinted with iOS green. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: c.green }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
    />
  );
}

/** Compact native time picker (the grey pill that expands into a wheel). */
export function TimePicker({
  value,
  onChange,
  accessibilityLabel,
  minimumDate,
  maximumDate,
  minuteInterval = 1,
  tint,
}: {
  value: Date;
  onChange: (d: Date) => void;
  accessibilityLabel: string;
  minimumDate?: Date;
  maximumDate?: Date;
  minuteInterval?: 1 | 5 | 15;
  tint?: string;
}) {
  return (
    <DateTimePicker
      value={value}
      mode="time"
      display="compact"
      minuteInterval={minuteInterval}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      accentColor={tint}
      accessibilityLabel={accessibilityLabel}
      onValueChange={(_e, d) => onChange(d)}
    />
  );
}

/** Hours + minutes wheel (iOS countdown mode) for durations such as "8 h 30 min". */
export function DurationPicker({
  minutes,
  onChange,
  accessibilityLabel,
}: {
  minutes: number;
  onChange: (m: number) => void;
  accessibilityLabel: string;
}) {
  const value = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return (
    <View style={styles.wheel}>
      <DateTimePicker
        value={value}
        mode="countdown"
        display="spinner"
        minuteInterval={5}
        accessibilityLabel={accessibilityLabel}
        onValueChange={(_e, d) => onChange(Math.max(15, d.getHours() * 60 + d.getMinutes()))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { height: 32 },
  wheel: { alignItems: 'stretch' },
});
