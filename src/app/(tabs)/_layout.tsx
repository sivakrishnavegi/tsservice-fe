import { NativeTabs } from 'expo-router/native-tabs';
import { useAppSettings } from '@/core/settings/app-settings';
import { useColors, useTint } from '@/core/theme';

/** One tab per module plus app Settings. A module that's turned off disappears from the bar. */
export default function TabsLayout() {
  const c = useColors();
  const office = useTint('office');
  const tiffin = useTint('tiffin');
  const modules = useAppSettings().data?.modules ?? { office: true, tiffin: true };

  return (
    <NativeTabs tintColor={c.label}>
      <NativeTabs.Trigger name="office" hidden={!modules.office}>
        <NativeTabs.Trigger.Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} md="work" selectedColor={office.text} />
        <NativeTabs.Trigger.Label selectedStyle={{ color: office.text }}>Office</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tiffin" hidden={!modules.tiffin}>
        <NativeTabs.Trigger.Icon sf={{ default: 'fork.knife', selected: 'fork.knife' }} md="restaurant" selectedColor={tiffin.text} />
        <NativeTabs.Trigger.Label selectedStyle={{ color: tiffin.text }}>Tiffin</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
