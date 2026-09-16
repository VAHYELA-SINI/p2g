import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function LoadingState({ message = 'Loading...', size = 'large', color = colors.black }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  spinner: {
    marginBottom: 14,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryText,
    textAlign: 'center',
  },
});
