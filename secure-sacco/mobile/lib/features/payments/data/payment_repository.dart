import 'package:dio/dio.dart';
import 'payment_dto.dart';

class PaymentRepository {
  final Dio _dio;

  PaymentRepository(this._dio);

  Future<InitiateStkResponse> initiateStkPush(InitiateStkRequest request) async {
    final response = await _dio.post('/api/v1/payments/stk-push', data: request.toJson());
    return InitiateStkResponse.fromJson(response.data);
  }
  
  Future<CoopBalanceResponse> getCoopBalance() async {
    final response = await _dio.get('/api/v1/payments/coop/balance');
    return CoopBalanceResponse.fromJson(response.data);
  }

  Future<CoopFeedResponse> getCoopFeed({int size = 20}) async {
    final response = await _dio.get('/api/v1/payments/coop/feed', queryParameters: {'size': size});
    return CoopFeedResponse.fromJson(response.data);
  }

  Future<Map<String, dynamic>> reEnrichCoopTransactions() async {
    final response = await _dio.post('/api/v1/payments/coop/re-enrich');
    return response.data as Map<String, dynamic>;
  }
}
