import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'payment_product_dto.dart';

final paymentProductRepositoryProvider = Provider<PaymentProductRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return PaymentProductRepository(dio);
});

class PaymentProductRepository {
  final Dio _dio;

  PaymentProductRepository(this._dio);

  // Admin: Get all products
  Future<List<ProductResponse>> getAllProducts() async {
    final response = await _dio.get('/api/v1/payment-products');
    return (response.data as List).map((json) => ProductResponse.fromJson(json)).toList();
  }

  // Admin: Create product
  Future<ProductResponse> createProduct(CreateProductRequest request) async {
    final response = await _dio.post('/api/v1/payment-products', data: request.toJson());
    return ProductResponse.fromJson(response.data);
  }

  // Admin: Update product
  Future<ProductResponse> updateProduct(String id, UpdateProductRequest request) async {
    final response = await _dio.put('/api/v1/payment-products/$id', data: request.toJson());
    return ProductResponse.fromJson(response.data);
  }

  // Admin: Delete custom product
  Future<void> deleteProduct(String id) async {
    await _dio.delete('/api/v1/payment-products/$id');
  }

  // Admin: Get product transactions
  Future<ProductTransactionPage> getProductTransactions(String id, {int page = 0, int size = 20}) async {
    final response = await _dio.get(
      '/api/v1/payment-products/$id/transactions',
      queryParameters: {'page': page, 'size': size},
    );
    return ProductTransactionPage.fromJson(response.data);
  }

  // Member: Get active products
  Future<List<ProductResponse>> getActiveProducts() async {
    final response = await _dio.get('/api/v1/payment-products/active');
    return (response.data as List).map((json) => ProductResponse.fromJson(json)).toList();
  }

  // Member: Get allocation context
  Future<List<ProductAllocationContext>> getAllocationContext() async {
    final response = await _dio.get('/api/v1/deposits/split/context');
    return (response.data as List).map((json) => ProductAllocationContext.fromJson(json)).toList();
  }

  // Member: Validate allocation
  Future<ValidateAllocationResponse> validateAllocation(ValidateAllocationRequest request) async {
    final response = await _dio.post('/api/v1/deposits/split/validate', data: request.toJson());
    return ValidateAllocationResponse.fromJson(response.data);
  }

  // Member: Initiate split deposit
  Future<void> initiateSplitDeposit(InitiateSplitDepositRequest request) async {
    await _dio.post('/api/v1/deposits/split/initiate', data: request.toJson());
  }

  // Member: Get recent split deposits
  Future<List<SplitDepositHistoryItem>> getMyRecentSplitDeposits() async {
    final response = await _dio.get('/api/v1/deposits/split/my-recent');
    return (response.data as List).map((json) => SplitDepositHistoryItem.fromJson(json)).toList();
  }

  // Member: Get my product transactions
  Future<ProductTransactionPage> getMyProductTransactions(String id, {int page = 0, int size = 20}) async {
    final response = await _dio.get(
      '/api/v1/payment-products/$id/my-transactions',
      queryParameters: {'page': page, 'size': size},
    );
    return ProductTransactionPage.fromJson(response.data);
  }
}
