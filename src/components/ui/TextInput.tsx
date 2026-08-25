/**
 * TextInput — themed text input.
 *
 * Differences from RN.TextInput:
 *  - Defaults to dark-theme styling (white text on surface bg, green focus ring).
 *  - Exposes a `label` prop instead of requiring a separate <Text> above.
 *  - Optional `error` prop shows a red helper text below the input.
 *  - The `prefix` prop renders a small label inside the input on the left
 *    (used for "kg" / "reps" units on the set-logger inputs).
 */

import React from 'react';
import { View, TextInput as RNTextInput, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { Text } from './Text';

export interface TextInputProps {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  prefix?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  testID?: string;
  maxLength?: number;
  editable?: boolean;
  /** When true, the input becomes a multi-line text area. */
  multiline?: boolean;
  /** Used with multiline to align text top-left (iOS-specific quirk). */
  textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
}

export function TextInput(props: TextInputProps) {
  const {
    value, onChangeText, placeholder, label, error, prefix,
    keyboardType = 'default', secureTextEntry, autoCapitalize = 'none',
    autoCorrect = false, returnKeyType = 'done', onSubmitEditing,
    onFocus, onBlur, style, containerStyle, testID, maxLength, editable = true,
    multiline, textAlignVertical,
  } = props;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="label" muted style={styles.label}>{label}</Text>
      ) : null}
      <View style={[styles.inputWrap, multiline ? styles.inputWrapMultiline : null, error ? styles.inputWrapError : null]}>
        {prefix ? <Text variant="body" muted style={styles.prefix}>{prefix}</Text> : null}
        <RNTextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={onFocus}
          onBlur={onBlur}
          maxLength={maxLength}
          editable={editable}
          multiline={multiline}
          textAlignVertical={textAlignVertical}
          style={[styles.input, multiline ? styles.inputMultiline : null, style]}
          underlineColorAndroid="transparent"
        />
      </View>
      {error ? (
        <Text variant="caption" style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputWrapMultiline: {
    height: undefined,
    minHeight: 80,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  inputWrapError: {
    borderColor: Colors.danger,
  },
  prefix: {
    marginRight: Spacing.sm,
    minWidth: 28,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.fontSize.md,
    padding: 0,
    height: '100%',
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  error: {
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
});
