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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { fetchCategories } from '../../src/api/categoriesApi';
import { fetchProducts } from '../../src/api/productsApi';
import ProductCard from '../../src/components/ProductCard';
import CategoryCard from '../../src/components/CategoryCard';
import CartBadge from '../../src/components/CartBadge';
import LoadingState from '../../src/components/LoadingState';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme';

export default function ProductListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [selectedCategory, setSelectedCategory] = useState(params.categoryId || null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [cats, prodsData] = await Promise.all([
        fetchCategories({ isActive: true }),
        fetchProducts({
          isAvailable: true,
          ...(selectedCategory ? { category: selectedCategory } : {}),
          limit: 50,
        }),
      ]);

      setCategories(cats);
      setProducts(prodsData.products || []);
    } catch (err) {
      console.error('Error loading products list:', err);
      setErrorMessage(err.message || 'Failed to load products.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const currentCategoryName =
    categories.find((c) => c._id === selectedCategory)?.name || params.categoryName || 'All Items';

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

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{currentCategoryName}</Text>
          <Text style={styles.headerSubtitle}>{products.length} items available</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.searchIconBtn}
            onPress={() => router.push('/(app)/search')}
            activeOpacity={0.75}
          >
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
          <CartBadge />
        </View>
      </View>

      {/* Category Pills Bar */}
      <View style={styles.pillsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          <CategoryCard
            size="pill"
            category={{ _id: 'ALL', name: 'All Items' }}
            isSelected={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
          />
          {categories.map((cat) => (
            <CategoryCard
              key={cat._id}
              size="pill"
              category={cat}
              isSelected={selectedCategory === cat._id}
              onPress={() => setSelectedCategory(cat._id)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.black]} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingState message="Loading catalog products..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={loadData} />
        ) : products.length === 0 ? (
          <EmptyState
            iconText="🍲"
            title="No Products Found"
            description="There are currently no items available under this category."
            actionLabel="View All Products"
            onAction={() => setSelectedCategory(null)}
          />
        ) : (
          <View style={styles.productsList}>
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onPress={() => router.push(`/(app)/product/${product._id}`)}
              />
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
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 16,
  },
  pillsWrapper: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pillsScroll: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  productsList: {
    width: '100%',
  },
});
