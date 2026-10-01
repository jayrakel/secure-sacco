import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'obligation_dto.dart';

final obligationRepositoryProvider = Provider<ObligationRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ObligationRepository(dio);
});

class ObligationRepository {
  final Dio _dio;

  ObligationRepository(this._dio);

  // ── Member ───────────────────────────────────────────────
  
  Future<List<ObligationResponse>> getMyObligations() async {
    final response = await _dio.get('/api/v1/obligations/my');
    return (response.data as List).map((i) => ObligationResponse.fromJson(i)).toList();
  }

  Future<PagedObligationPeriodResponse> getMyHistory({int page = 0, int size = 20}) async {
    final response = await _dio.get('/api/v1/obligations/my/history', queryParameters: {'page': page, 'size': size});
    return PagedObligationPeriodResponse.fromJson(response.data);
  }

  // ── Staff ────────────────────────────────────────────────
  
  Future<PagedObligationComplianceResponse> getComplianceReport({int page = 0, int size = 20}) async {
    final response = await _dio.get('/api/v1/obligations/compliance', queryParameters: {'page': page, 'size': size});
    return PagedObligationComplianceResponse.fromJson(response.data);
  }

  Future<ObligationResponse> createObligation(CreateObligationRequest request) async {
    final response = await _dio.post('/api/v1/obligations', data: request.toJson());
    return ObligationResponse.fromJson(response.data);
  }

  Future<ObligationResponse> updateObligation(String id, UpdateObligationRequest request) async {
    final response = await _dio.put('/api/v1/obligations/$id', data: request.toJson());
    return ObligationResponse.fromJson(response.data);
  }

  Future<ObligationResponse> updateStatus(String id, ObligationStatus status) async {
    final response = await _dio.patch('/api/v1/obligations/$id/status', data: {'status': status.name});
    return ObligationResponse.fromJson(response.data);
  }

  Future<List<ObligationResponse>> getObligationsByMemberId(String memberId) async {
    final response = await _dio.get('/api/v1/obligations/member/$memberId');
    return (response.data as List).map((i) => ObligationResponse.fromJson(i)).toList();
  }

  Future<PagedObligationPeriodResponse> getHistoryByMemberId(String memberId, {int page = 0, int size = 20}) async {
    final response = await _dio.get('/api/v1/obligations/member/$memberId/history', queryParameters: {'page': page, 'size': size});
    return PagedObligationPeriodResponse.fromJson(response.data);
  }

  Future<void> triggerEvaluation() async {
    await _dio.post('/api/v1/obligations/evaluate');
  }
}
