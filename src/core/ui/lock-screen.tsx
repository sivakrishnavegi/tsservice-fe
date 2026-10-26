import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { SymbolView } from 'expo-symbols';
import { space, useColors, useTint } from '@/core/theme';
import { Button } from './button';
import { Text } from './text';

/** Re-lock after the app has been in the background this long. */
const RELOCK_AFTER_MS = 60_000;

/**
 * Full-screen Face ID gate. Renders nothing when unlocked.
 * Locks on launch and after the app has been away for a minute.
 */
export function LockGate({ enabled }: { enabled: boolean }) {
  const c = useColors();
  const tint = useTint('office');
  const [locked, setLocked] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(
    () =>
      LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock TS Service', fallbackLabel: 'Use passcode' }).then((result) => {
        if (result.success) {
          setLocked(false);
          setError(null);
        } else if (result.error !== 'user_cancel' && result.error !== 'app_cancel') {
          setError("Couldn't unlock. Try again.");
        }
      }),
    [],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (!enabled) return;
      if (s === 'background') backgroundedAt.current = Date.now();
      if (s === 'active' && backgroundedAt.current && Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  const isLocked = enabled && locked;
  useEffect(() => {
    if (isLocked) void unlock();
  }, [isLocked, unlock]);

  if (!isLocked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: c.bg }]} accessibilityViewIsModal>
      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: tint.fill }]}>
          <SymbolView name="lock.fill" size={40} tintColor="#FFFFFF" />
        </View>
        <Text variant="title2">TS Service is locked</Text>
        <Text tone="secondary" style={styles.text}>
          Your office and tiffin records stay on this iPhone.
        </Text>
      </View>
      <View style={styles.actions}>
        {error && (
          <Text variant="footnote" tone="redText" style={styles.text} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Button
          label="Unlock with Face ID"
          icon="faceid"
          size="lg"
          background={tint.fill}
          foreground="#FFFFFF"
          onPress={() => void unlock()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, padding: space.xl, paddingBottom: 56 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  icon: { width: 88, height: 88, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  text: { textAlign: 'center' },
  actions: { gap: space.md },
});
