import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { formatDuration, formatShortTimer, formatTime } from '@/core/dates';
import { radius, space, useColors, useTint, type Palette, type Tint } from '@/core/theme';
import { enter } from '@/core/theme/motion';
import { Button } from '@/core/ui/button';
import { ProgressRing } from '@/core/ui/progress-ring';
import { StatRow } from '@/core/ui/stats';
import { Text } from '@/core/ui/text';
import type { OfficeSummary } from '../time';

export type ShiftAction = 'checkIn' | 'checkOut' | 'startBreak' | 'endBreak' | 'undoCheckOut' | 'editDay' | 'backToWorkday';

interface RingView {
  badge: string;
  badgeColor: string;
  headline: string;
  caption: string;
  ring: string;
}

function ringView(s: OfficeSummary, c: Palette, tint: Tint): RingView {
  switch (s.status) {
    case 'not_started':
      return {
        badge: 'Not started',
        badgeColor: c.secondary,
        headline: formatDuration(s.targetMs),
        caption: 'to work today',
        ring: tint.base,
      };
    case 'day_off':
      return { badge: 'Day off', badgeColor: c.secondary, headline: 'Day off', caption: 'not a work day', ring: c.gray };
    case 'working':
      return s.remainingMs > 0
        ? { badge: 'Working', badgeColor: tint.text, headline: formatDuration(s.remainingMs), caption: 'left today', ring: tint.base }
        : {
            badge: 'Target met',
            badgeColor: c.greenText,
            headline: `+${formatDuration(s.overtimeMs)}`,
            caption: 'overtime',
            ring: c.green,
          };
    case 'on_break':
      return {
        badge: 'On break',
        badgeColor: c.indigoText,
        headline: formatShortTimer(s.openBreakMs),
        caption: 'break running',
        ring: c.indigo,
      };
    case 'checked_out':
      return {
        badge: 'Checked out',
        badgeColor: c.secondary,
        headline: formatDuration(s.workedMs),
        caption: 'worked today',
        ring: s.remainingMs === 0 ? c.green : tint.base,
      };
    case 'leave':
      return { badge: 'Leave', badgeColor: c.orangeText, headline: 'On leave', caption: 'no target today', ring: c.orange };
    case 'holiday':
      return { badge: 'Holiday', badgeColor: c.orangeText, headline: 'Holiday', caption: 'no target today', ring: c.orange };
  }
}

function statusLine(s: OfficeSummary): string {
  switch (s.status) {
    case 'working':
      return `Worked ${formatDuration(s.workedMs)} since ${formatTime(s.checkInAt!)}, breaks excluded.`;
    case 'on_break':
      return `Break started at ${formatTime(s.openBreak!.start)}. Your work timer is paused.`;
    case 'not_started':
      return 'Forgot to check in? Enter the time you arrived.';
    case 'day_off':
      return 'You can still check in if you work today.';
    case 'checked_out':
      if (s.missingCheckOut) return 'Check-out is missing. Tap the times to fix it.';
      if (s.overtimeMs > 0) return `${formatDuration(s.overtimeMs)} over your target.`;
      if (s.remainingMs > 0) return `${formatDuration(s.remainingMs)} short of your target.`;
      return 'Target met.';
    default:
      return 'Nothing is lost if you change it back.';
  }
}

/** The hero card on Office: ring, three numbers, and the one or two actions that make sense now. */
export function ShiftCard({ summary: s, busy, onAction }: { summary: OfficeSummary; busy: boolean; onAction: (a: ShiftAction) => void }) {
  const c = useColors();
  const tint = useTint('office');
  const v = ringView(s, c, tint);
  const active = s.status === 'working' || s.status === 'on_break';
  const times =
    s.checkInAt && s.checkOutAt ? `${formatTime(s.checkInAt)} – ${formatTime(s.checkOutAt)}` : s.checkInAt ? formatTime(s.checkInAt) : '—';

  return (
    <View style={[styles.card, { backgroundColor: c.cell }]}>
      <View style={styles.ringWrap}>
        <ProgressRing progress={s.progress} color={v.ring} accessibilityLabel={`${v.badge}. ${v.headline} ${v.caption}`}>
          {/* Keyed by state, so text re-enters on a state change and not on every tick. */}
          <Animated.View key={`${s.status}-${v.caption}`} entering={enter()} style={styles.ringText}>
            <Text variant="badge" color={v.badgeColor}>
              {v.badge}
            </Text>
            <Text variant="hero" adjustsFontSizeToFit numberOfLines={1}>
              {v.headline}
            </Text>
            <Text variant="subheadline" tone="secondary">
              {v.caption}
            </Text>
          </Animated.View>
        </ProgressRing>
      </View>

      <StatRow
        stats={[
          {
            label: s.checkOutAt ? 'In – out' : 'Checked in',
            value: times,
            color: tint.text,
            onPress: () => onAction('editDay'),
            accessibilityHint: 'Edit check-in, breaks and check-out',
          },
          { label: 'Breaks', value: formatDuration(s.breakMs) },
          { label: active ? 'Leave at' : 'Worked', value: active ? (s.leaveAt ? formatTime(s.leaveAt) : '—') : formatDuration(s.workedMs) },
        ]}
      />

      <View style={styles.actions}>
        {s.status === 'not_started' || s.status === 'day_off' ? (
          <>
            <Button
              size="lg"
              icon="play.fill"
              label="Check in now"
              background={tint.fill}
              foreground="#FFFFFF"
              haptic="medium"
              loading={busy}
              onPress={() => onAction('checkIn')}
            />
            <Button
              icon="clock"
              label="Enter check-in time"
              background={c.fill}
              foreground={tint.text}
              onPress={() => onAction('editDay')}
            />
          </>
        ) : s.status === 'working' ? (
          <View style={styles.pair}>
            <Button
              style={styles.flex}
              size="lg"
              icon="cup.and.saucer.fill"
              label="Start break"
              background={c.indigoBg}
              foreground={c.indigoText}
              haptic="light"
              loading={busy}
              onPress={() => onAction('startBreak')}
            />
            <Button
              style={styles.flex}
              size="lg"
              icon="stop.fill"
              label="Check out"
              background={c.redBg}
              foreground={c.redText}
              haptic="medium"
              onPress={() => onAction('checkOut')}
            />
          </View>
        ) : s.status === 'on_break' ? (
          <Button
            size="lg"
            icon="play.fill"
            label="End break"
            background={c.indigoFill}
            foreground="#FFFFFF"
            haptic="medium"
            loading={busy}
            onPress={() => onAction('endBreak')}
          />
        ) : s.status === 'checked_out' ? (
          !s.missingCheckOut && (
            <Button
              icon="arrow.uturn.backward"
              label="Undo check-out"
              background={c.fill}
              foreground={tint.text}
              onPress={() => onAction('undoCheckOut')}
            />
          )
        ) : (
          <Button
            icon="briefcase"
            label="Back to a workday"
            background={c.orangeBg}
            foreground={c.orangeText}
            onPress={() => onAction('backToWorkday')}
          />
        )}
      </View>

      <Text variant="footnote" tone="secondary" style={styles.center}>
        {statusLine(s)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.hero, padding: space.xl, paddingTop: space.xxl, gap: space.xl },
  ringWrap: { alignItems: 'center' },
  ringText: { alignItems: 'center', gap: 2, paddingHorizontal: space.xl },
  actions: { gap: space.md },
  pair: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  center: { textAlign: 'center', marginTop: -space.sm },
});
