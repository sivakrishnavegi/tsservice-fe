import * as Notifications from 'expo-notifications';
import { atClock, formatTime, MINUTE } from '@/core/dates';
import { summarizeDay } from './time';
import type { OfficeDay, OfficeSettings } from './types';

const IDS = { leaveAt: 'office.leaveAt', forgot: 'office.forgotCheckOut', longBreak: 'office.longBreak' } as const;

async function scheduleAt(identifier: string, date: Date, title: string, body: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

async function cancel(identifier: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}

/**
 * Re-plans today's office reminders from the current state. Safe to call after every change.
 * Silently does nothing when notification permission hasn't been granted.
 */
export async function syncOfficeReminders(today: OfficeDay, settings: OfficeSettings, now = new Date()): Promise<void> {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  const s = summarizeDay(today, settings, now);
  const active = s.status === 'working' || s.status === 'on_break';

  if (settings.reminders.leaveAt && s.status === 'working' && s.leaveAt && s.remainingMs > 0) {
    await scheduleAt(IDS.leaveAt, new Date(s.leaveAt.getTime() - 15 * MINUTE), 'Almost done', `You can leave at ${formatTime(s.leaveAt)}.`);
  } else await cancel(IDS.leaveAt);

  if (settings.reminders.forgotCheckOut && active) {
    await scheduleAt(
      IDS.forgot,
      atClock(today.date, settings.forgotCheckOutTime),
      'Still checked in?',
      'Check out so today’s hours are right.',
    );
  } else await cancel(IDS.forgot);

  if (settings.reminders.longBreak && s.openBreak) {
    const at = new Date(Date.parse(s.openBreak.start) + settings.longBreakMinutes * MINUTE);
    await scheduleAt(IDS.longBreak, at, 'Long break', `Your break has passed ${settings.longBreakMinutes} minutes.`);
  } else await cancel(IDS.longBreak);
}
