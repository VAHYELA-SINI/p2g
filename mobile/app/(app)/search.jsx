import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchProducts } from '../../src/api/productsApi';
import SearchBar from '../../src/components/SearchBar';
import ProductCard from '../../src/components/ProductCard';
import CartBadge from '../../src/components/CartBadge';
import LoadingState from '../../src/components/LoadingState';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme';

export default function SearchScreen() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceTimerRef = useRef(null);

  const performSearch = useCallback(async (searchTerm) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      setErrorMessage(null);
      const data = await fetchProducts({
        search: trimmed,
        isAvailable: true,
        limit: 30,
      });
      setResults(data.products || []);
      setHasSearched(true);
    } catch (err) {
      console.error('Search error:', err);
      setErrorMessage(err.message || 'Error occurred while searching.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    // Debounce search by 400ms
    debounceTimerRef.current = setTimeout(() => {
      performSearch(text);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
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

        <View style={styles.searchContainer}>
          <SearchBar
            value={query}
            onChangeText={handleQueryChange}
            onClear={handleClear}
            onSubmit={() => performSearch(query)}
            placeholder="Search groceries & meals..."
            autoFocus
          />
        </View>

        <CartBadge />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSearching ? (
          <LoadingState message={`Searching catalog for "${query}"...`} />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => performSearch(query)} />
        ) : hasSearched && results.length === 0 ? (
          <EmptyState
            iconText="🔍"
            title="No Matching Items"
            description={`We couldn't find any products matching "${query}". Try searching with different keywords.`}
            actionLabel="Clear Search"
            onAction={handleClear}
          />
        ) : hasSearched ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsCount}>
              Found {results.length} result{results.length === 1 ? '' : 's'} for "{query}"
            </Text>
            {results.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onPress={() => router.push(`/(app)/product/${product._id}`)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.initialState}>
            <Text style={styles.initialEmoji}>🍽️</Text>
            <Text style={styles.initialTitle}>Find What You Crave</Text>
            <Text style={styles.initialSubtitle}>
              Type food names, groceries, or categories above to search our fresh catalog.
            </Text>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
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
  searchContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resultsContainer: {
    width: '100%',
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    marginBottom: 16,
  },
  initialState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  initialEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  initialTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 8,
  },
  initialSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
