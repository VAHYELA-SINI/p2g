import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import { colors, shadows } from '../theme';

export default function CategoryCard({ category, isSelected = false, onPress, size = 'medium' }) {
  const isAll = !category || category._id === 'ALL' || category.slug === 'all';
  const name = isAll ? 'All Items' : category.name;
  const imageUri = category?.image;

  if (size === 'pill') {
    return (
      <TouchableOpacity
        style={[styles.pillContainer, isSelected && styles.pillSelected]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.cardContainer, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.imageWrapper, isSelected && styles.imageWrapperSelected]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.categoryImage} resizeMode="cover" />
        ) : (
          <View style={[styles.iconFallback, isSelected && styles.iconFallbackSelected]}>
            <Text style={styles.fallbackEmoji}>🍽️</Text>
          </View>
        )}
      </View>
      <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: 98,
    alignItems: 'center',
    marginRight: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  imageWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: colors.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageWrapperSelected: {
    backgroundColor: colors.charcoal,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grey100,
  },
  iconFallbackSelected: {
    backgroundColor: colors.charcoal,
  },
  fallbackEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  pillContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  pillSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  pillTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});
