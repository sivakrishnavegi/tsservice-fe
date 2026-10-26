import { useState } from 'react';
import { ActionSheetIOS, Alert, StyleSheet, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { formatRelativeDay, todayKey } from '@/core/dates';
import { radius, space, type as typeScale, useColors, useTint } from '@/core/theme';
import { Button } from '@/core/ui/button';
import { Section } from '@/core/ui/list';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Message, Screen, Skeleton } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { statusColors, STATUS_ICON } from '@/modules/tiffin/components/status';
import { captureMealPhoto, deleteMealPhoto, PhotoError, type PhotoSource } from '@/modules/tiffin/photos';
import { useTiffinRange, useUpdateMeal } from '@/modules/tiffin/queries';
import { MEALS, MEAL_LABEL, STATUS_LABEL, type MarkedStatus, type Meal, type MealLog, type MealStatus } from '@/modules/tiffin/types';

const OPTIONS: readonly MarkedStatus[] = ['received', 'not_received', 'leave'];

export default function MealSheet() {
  const params = useLocalSearchParams<{ date: string; meal: string }>();
  const date = params.date ?? todayKey();
  const meal = (MEALS as readonly string[]).includes(params.meal ?? '') ? (params.meal as Meal) : null;
  const logs = useTiffinRange(date, date);
  if (!meal) return <Message icon="questionmark.circle" title="Unknown meal" />;
  if (logs.isError) return <Message icon="exclamationmark.triangle" title="Couldn't load this meal" body={logs.error.message} />;
  if (!logs.data) {
    return (
      <Screen>
        <Skeleton height={260} />
      </Screen>
    );
  }
  return <MealForm date={date} meal={meal} log={logs.data.find((l) => l.meal === meal)} />;
}

function MealForm({ date, meal, log }: { date: string; meal: Meal; log: MealLog | undefined }) {
  const update = useUpdateMeal();
  const c = useColors();
  const tint = useTint('tiffin');
  const [status, setStatus] = useState<MealStatus>(log?.status ?? 'pending');
  const [remark, setRemark] = useState(log?.remark ?? '');
  const [photoUri, setPhotoUri] = useState<string | undefined>(log?.photoUri);
  const [busy, setBusy] = useState(false);

  const dirty = status !== (log?.status ?? 'pending') || remark.trim() !== (log?.remark ?? '') || photoUri !== log?.photoUri;

  const close = () => {
    // A photo taken in this sheet but not saved is removed again.
    if (photoUri && photoUri !== log?.photoUri) deleteMealPhoto(photoUri);
    router.back();
  };

  const onCancel = () => {
    if (!dirty) return close();
    Alert.alert('Discard changes?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: close },
    ]);
  };

  const onSave = () =>
    update.mutate([{ date, meal, status, remark: remark.trim(), photoUri: photoUri ?? null }], {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert("Couldn't save", e.message),
    });

  const addPhoto = async (source: PhotoSource) => {
    setBusy(true);
    try {
      const uri = await captureMealPhoto(source);
      if (uri) {
        if (photoUri && photoUri !== log?.photoUri) deleteMealPhoto(photoUri);
        setPhotoUri(uri);
      }
    } catch (e) {
      Alert.alert('Photo not added', e instanceof PhotoError ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const photoMenu = () => {
    const options = photoUri
      ? ['Take photo', 'Choose from library', 'Remove photo', 'Cancel']
      : ['Take photo', 'Choose from library', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: photoUri ? 2 : undefined },
      (i) => {
        if (i === 0) void addPhoto('camera');
        else if (i === 1) void addPhoto('library');
        else if (i === 2 && photoUri) setPhotoUri(undefined);
      },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: `${MEAL_LABEL[meal]} · ${formatRelativeDay(date)}` }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={onCancel}>Cancel</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" disabled={update.isPending} onPress={onSave}>
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Screen>
        {
          <>
            <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="Status">
              {OPTIONS.map((o) => {
                const on = status === o;
                const col = statusColors(c, o);
                return (
                  <PressableScale
                    key={o}
                    haptic="selection"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={STATUS_LABEL[o]}
                    onPress={() => setStatus(on ? 'pending' : o)}
                    style={[styles.option, { backgroundColor: on ? col.bg : c.cell, borderColor: on ? col.ring : 'transparent' }]}
                  >
                    <SymbolView
                      name={o === 'leave' ? 'sun.max' : STATUS_ICON[o]}
                      size={24}
                      weight="bold"
                      tintColor={on ? col.fg : c.secondary}
                    />
                    <Text variant="subheadline" style={{ color: on ? col.fg : c.secondary, fontWeight: '600' }}>
                      {STATUS_LABEL[o]}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            <Section header="Remark">
              <TextInput
                value={remark}
                onChangeText={setRemark}
                placeholder="Arrived late, extra roti"
                placeholderTextColor={c.tertiary}
                maxLength={280}
                multiline
                accessibilityLabel="Remark"
                style={[typeScale.body, styles.input, { color: c.label }]}
              />
            </Section>

            <Section header="Photo">
              <View style={styles.photoRow}>
                <PressableScale
                  onPress={photoMenu}
                  disabled={busy}
                  accessibilityLabel={photoUri ? 'Change photo' : 'Add photo'}
                  style={[styles.thumb, { backgroundColor: c.fill }]}
                >
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
                  ) : (
                    <SymbolView name="camera" size={26} tintColor={c.secondary} />
                  )}
                </PressableScale>
                <View style={styles.photoActions}>
                  <Button
                    size="sm"
                    label={photoUri ? 'Replace photo' : 'Take photo'}
                    icon="camera"
                    background={tint.bg}
                    foreground={tint.text}
                    loading={busy}
                    onPress={() => void addPhoto('camera')}
                  />
                  <Button
                    size="sm"
                    label="Choose from library"
                    background="transparent"
                    foreground={tint.text}
                    disabled={busy}
                    onPress={() => void addPhoto('library')}
                  />
                </View>
              </View>
            </Section>
            <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: space.lg, marginTop: -space.lg }}>
              Photos stay on this iPhone.
            </Text>
          </>
        }
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', gap: space.md },
  option: { flex: 1, height: 88, borderRadius: radius.card, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 6 },
  input: { minHeight: 88, paddingHorizontal: space.lg, paddingVertical: space.md, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg },
  thumb: { width: 72, height: 72, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoActions: { flex: 1, alignItems: 'flex-start', gap: space.xs },
});
