import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, shadows } from '../theme';

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'Search items in store...',
  autoFocus = false,
  editable = true,
  onPress,
}) {
  if (!editable && onPress) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.placeholderText}>{value || placeholder}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.grey400}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        clearButtonMode="while-editing"
      />
      {value && value.length > 0 ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    color: colors.primaryText,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.primaryText,
    paddingVertical: 0,
  },
  placeholderText: {
    flex: 1,
    fontSize: 15,
    color: colors.grey400,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 11,
    color: colors.grey600,
    fontWeight: '700',
  },
});
