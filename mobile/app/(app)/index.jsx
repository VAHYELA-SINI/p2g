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
import { useAuthStore } from '../../src/store/authStore';
import { fetchCategories } from '../../src/api/categoriesApi';
import { fetchProducts } from '../../src/api/productsApi';
import ProductCard from '../../src/components/ProductCard';
import CategoryCard from '../../src/components/CategoryCard';
import SearchBar from '../../src/components/SearchBar';
import CartBadge from '../../src/components/CartBadge';
import LoadingState from '../../src/components/LoadingState';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import { colors, shadows } from '../../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); // null = All
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
          limit: 20,
        }),
      ]);

      setCategories(cats);
      setProducts(prodsData.products || []);
    } catch (err) {
      console.error('Error loading home data:', err);
      setErrorMessage(err.message || 'Failed to load catalog items from the store.');
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

  const handleSelectCategory = (catId) => {
    setSelectedCategory((prev) => (prev === catId ? null : catId));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => router.push('/(app)/profile')}
          activeOpacity={0.8}
        >
          <View style={styles.storeBadge}>
            <Text style={styles.storeBadgeText}>P2G</Text>
          </View>
          <View>
            <Text style={styles.greetingText}>
              Welcome, {user?.name?.split(' ')[0] || 'Customer'}
            </Text>
            <Text style={styles.storeSubtitle}>Fresh Foods & Groceries</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => router.push('/(app)/orders')}
            activeOpacity={0.75}
          >
            <Text style={styles.navEmojiIcon}>📦</Text>
          </TouchableOpacity>
          <CartBadge />
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => router.push('/(app)/profile')}
            activeOpacity={0.75}
          >
            <Text style={styles.navEmojiIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.black]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar Shortcut */}
        <View style={styles.searchSection}>
          <SearchBar
            editable={false}
            onPress={() => router.push('/(app)/search')}
            placeholder="Search our delicious catalog..."
          />
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/categories')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See All ({categories.length}) →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          <CategoryCard
            category={{ _id: 'ALL', name: 'All Items' }}
            isSelected={selectedCategory === null}
            onPress={() => handleSelectCategory(null)}
          />
          {categories.map((category) => (
            <CategoryCard
              key={category._id}
              category={category}
              isSelected={selectedCategory === category._id}
              onPress={() => handleSelectCategory(category._id)}
            />
          ))}
        </ScrollView>

        {/* Products Section */}
        <View style={styles.productsHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory
              ? `${categories.find((c) => c._id === selectedCategory)?.name || 'Filtered'} Items`
              : 'Popular & Fresh Items'}
          </Text>
          <Text style={styles.productCountBadge}>{products.length} items</Text>
        </View>

        {/* Loading / Error / Empty States */}
        {isLoading ? (
          <LoadingState message="Fetching fresh items from store..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={loadData} />
        ) : products.length === 0 ? (
          <EmptyState
            iconText="🍲"
            title="No Products Available"
            description={
              selectedCategory
                ? 'No items found in this category. Try selecting another category.'
                : 'Our store shelves are currently updating. Please check back shortly.'
            }
            actionLabel={selectedCategory ? 'Show All Products' : 'Refresh'}
            onAction={selectedCategory ? () => setSelectedCategory(null) : loadData}
          />
        ) : (
          <View style={styles.productsGrid}>
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
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...shadows.sm,
  },
  storeBadgeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  storeSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navEmojiIcon: {
    fontSize: 18,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 14,
  },
  productCountBadge: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  productsGrid: {
    paddingHorizontal: 20,
  },
});
