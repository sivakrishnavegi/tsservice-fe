import { StyleSheet, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { formatDuration, formatTime } from '@/core/dates';
import { useColors, useTint } from '@/core/theme';
import { Row, Section } from '@/core/ui/list';
import { breakLengthMs, type OfficeSummary } from '../time';
import type { OfficeDay } from '../types';

function Dot({ icon, bg, fg }: { icon: SFSymbol; bg: string; fg: string }) {
  return (
    <View style={[styles.dot, { backgroundColor: bg }]}>
      <SymbolView name={icon} size={12} weight="bold" tintColor={fg} />
    </View>
  );
}

/** Check-in → breaks → check-out for one day. Every row opens the day editor. */
export function Timeline({ day, summary, now, onEdit }: { day: OfficeDay; summary: OfficeSummary; now: Date; onEdit: () => void }) {
  const c = useColors();
  const tint = useTint('office');

  if (!day.checkIn) {
    return (
      <Section header="Today's timeline" inset={56} footer="Breaks don't count as work, so each one moves your leave-at time later.">
        <Row
          title="Not checked in yet"
          subtitle="Tap to enter your arrival time"
          leading={<Dot icon="flag" bg={c.fill} fg={c.secondary} />}
          chevron
          onPress={onEdit}
        />
      </Section>
    );
  }

  return (
    <Section header="Today's timeline" inset={56} footer="Breaks don't count as work, so each one moves your leave-at time later.">
      <Row
        title="Checked in"
        subtitle={summary.lateMinutes > 0 ? `${summary.lateMinutes} min late` : 'Tap to change the time'}
        value={formatTime(day.checkIn)}
        valueColor={c.label}
        leading={<Dot icon="checkmark" bg={tint.bg} fg={tint.text} />}
        chevron
        onPress={onEdit}
      />
      {day.breaks.map((b) => (
        <Row
          key={b.id}
          title={b.label}
          subtitle={`${formatTime(b.start)} – ${b.end ? formatTime(b.end) : 'now'}`}
          value={formatDuration(breakLengthMs(b, now))}
          valueColor={b.end ? c.label : c.indigoText}
          leading={<Dot icon="cup.and.saucer.fill" bg={c.indigoBg} fg={c.indigoText} />}
          chevron
          onPress={onEdit}
        />
      ))}
      <Row
        title={day.checkOut ? 'Checked out' : 'Check out'}
        subtitle={day.checkOut ? undefined : 'Expected, if no more breaks'}
        value={day.checkOut ? formatTime(day.checkOut) : summary.leaveAt ? formatTime(summary.leaveAt) : '—'}
        valueColor={day.checkOut ? c.label : c.secondary}
        leading={<Dot icon="flag.checkered" bg={c.fill} fg={c.secondary} />}
        chevron
        onPress={onEdit}
      />
      <Row
        title="Add a break manually"
        titleColor={tint.text}
        leading={<Dot icon="plus" bg="transparent" fg={tint.text} />}
        onPress={onEdit}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
