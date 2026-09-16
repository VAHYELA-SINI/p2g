import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchCategories } from '../../src/api/categoriesApi';
import CategoryCard from '../../src/components/CategoryCard';
import CartBadge from '../../src/components/CartBadge';
import LoadingState from '../../src/components/LoadingState';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import { safeBack } from '../../src/utils/navigation';
import { colors, shadows } from '../../src/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await fetchCategories({ isActive: true });
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setErrorMessage(err.message || 'Failed to load categories.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadCategories();
  }, [loadCategories]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCategories();
  };

  const handleCategoryPress = (category) => {
    router.push({
      pathname: '/(app)/products',
      params: { categoryId: category._id, categoryName: category.name },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeBack(router, '/(app)')}
          activeOpacity={0.75}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>All Categories</Text>

        <CartBadge />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.black]} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingState message="Loading store categories..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={loadCategories} />
        ) : categories.length === 0 ? (
          <EmptyState
            iconText="🏷️"
            title="No Categories"
            description="The store currently has no active categories."
            actionLabel="Refresh"
            onAction={loadCategories}
          />
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={styles.categoryTile}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.85}
              >
                <CategoryCard category={cat} onPress={() => handleCategoryPress(cat)} />
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>{cat.name}</Text>
                  {cat.description ? (
                    <Text style={styles.tileDescription} numberOfLines={2}>
                      {cat.description}
                    </Text>
                  ) : null}
                  <Text style={styles.browseLink}>Browse items →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.primaryText,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  scrollContent: {
    padding: 20,
  },
  grid: {
    gap: 12,
  },
  categoryTile: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  tileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  tileDescription: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
    marginBottom: 6,
  },
  browseLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
  },
});
