// components/BackButton.tsx
import React, { useCallback } from 'react';
import { Pressable, Text, ViewStyle, StyleSheet, View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type BackButtonProps = {
  label?: string;                  // Optional text next to the chevron
  onPress?: () => void;            // Custom handler (runs instead of default)
  confirmMessage?: string;         // If set, show confirm dialog before going back
  disabledOnRoot?: boolean;        // If true, hide/disable when cannot go back
  fallbackRoute?: string;          // If cannot go back, navigate here
  style?: ViewStyle;               // Container style
  testID?: string;
};

export default function BackButton({
  label,
  onPress,
  confirmMessage,
  disabledOnRoot = true,
  fallbackRoute,
  style,
  testID,
}: BackButtonProps) {
  const navigation = useNavigation<any>();
  const canGoBack = navigation.canGoBack?.() ?? false;

  const handleDefaultBack = useCallback(() => {
    if (canGoBack) {
      navigation.goBack();
    } else if (fallbackRoute) {
      navigation.navigate(fallbackRoute as never);
    }
  }, [canGoBack, fallbackRoute, navigation]);

  const handlePress = useCallback(() => {
    if (onPress) return onPress();

    if (confirmMessage) {
      Alert.alert('Confirm', confirmMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: handleDefaultBack },
      ]);
      return;
    }

    handleDefaultBack();
  }, [onPress, confirmMessage, handleDefaultBack]);

  const disabled = disabledOnRoot && !canGoBack && !fallbackRoute;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, disabled && styles.disabled, style]}
      hitSlop={12}
      testID={testID}
    >
      {/* Simple chevron without icon libs */}
      <Text style={[styles.chevron, disabled && styles.chevronDisabled]}>‹</Text>
      {label ? (
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8 },
  disabled: { opacity: 0.4 },
  chevron: { fontSize: 28, lineHeight: 28 },
  chevronDisabled: { color: '#777' },
  label: { marginLeft: 2, fontSize: 16 },
  labelDisabled: { color: '#777' },
});
