import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'payment_product_dto.dart';
import 'payment_product_repository.dart';

// Admin: All Payment Products
final paymentProductsProvider = FutureProvider.autoDispose<List<ProductResponse>>((ref) async {
  final repository = ref.watch(paymentProductRepositoryProvider);
  return repository.getAllProducts();
});

// Admin: Transactions for a specific product
final productTransactionsProvider = FutureProvider.autoDispose.family<ProductTransactionPage, String>((ref, productId) async {
  final repository = ref.watch(paymentProductRepositoryProvider);
  return repository.getProductTransactions(productId);
});

// Member: Active Payment Products
final activePaymentProductsProvider = FutureProvider.autoDispose<List<ProductResponse>>((ref) async {
  final repository = ref.watch(paymentProductRepositoryProvider);
  return repository.getActiveProducts();
});

// Member: Allocation Context
final allocationContextProvider = FutureProvider.autoDispose<List<ProductAllocationContext>>((ref) async {
  final repository = ref.watch(paymentProductRepositoryProvider);
  return repository.getAllocationContext();
});

// Member: Recent Split Deposits
final recentSplitDepositsProvider = FutureProvider.autoDispose<List<SplitDepositHistoryItem>>((ref) async {
  final repository = ref.watch(paymentProductRepositoryProvider);
  return repository.getMyRecentSplitDeposits();
});

// Member: My Transactions for a specific product
final myProductTransactionsProvider = FutureProvider.autoDispose.family<ProductTransactionPage, String>((ref, productId) async {
  final repository = ref.watch(paymentProductRepositoryProvider);
  return repository.getMyProductTransactions(productId);
});
