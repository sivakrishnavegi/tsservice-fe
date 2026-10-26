import * as Notifications from 'expo-notifications';
import { clockToMinutes } from '@/core/dates';
import { MEALS, MEAL_LABEL, type TiffinSettings } from './types';

const id = (meal: string) => `tiffin.${meal}`;

/** One daily reminder per tracked meal, a little after its usual time. */
export async function syncTiffinReminders(settings: TiffinSettings): Promise<void> {
  const { granted } = await Notifications.getPermissionsAsync();
  for (const meal of MEALS) {
    await Notifications.cancelScheduledNotificationAsync(id(meal)).catch(() => undefined);
    const cfg = settings.meals[meal];
    if (!granted || !settings.reminders || !cfg.enabled) continue;
    const at = clockToMinutes(cfg.time) + settings.reminderDelayMinutes;
    await Notifications.scheduleNotificationAsync({
      identifier: id(meal),
      content: { title: `${MEAL_LABEL[meal]} arrived?`, body: 'Mark it as received, missed or leave.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: Math.floor(at / 60) % 24, minute: at % 60 },
    });
  }
}
