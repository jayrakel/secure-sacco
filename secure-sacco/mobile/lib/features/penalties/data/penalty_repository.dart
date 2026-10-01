import 'package:dio/dio.dart';
import 'penalty_dto.dart';
import '../../payments/data/payment_dto.dart';

class PenaltyRepository {
  final Dio _dio;

  PenaltyRepository(this._dio);

  // Member
  Future<List<PenaltySummary>> getMyOpenPenalties() async {
    final response = await _dio.get('/api/v1/penalties/my');
    final List<dynamic> data = response.data;
    return data.map((json) => PenaltySummary.fromJson(json)).toList();
  }

  Future<InitiateStkResponse> repayPenalty({
    required String phoneNumber,
    required double amount,
    String? penaltyId,
  }) async {
    final response = await _dio.post('/api/v1/penalties/repay', data: {
      'phoneNumber': phoneNumber,
      'amount': amount,
      'penaltyId': penaltyId,
    });
    return InitiateStkResponse.fromJson(response.data);
  }

  // Staff
  Future<List<StaffPenalty>> getAllOpenPenalties() async {
    final response = await _dio.get('/api/v1/penalties/staff');
    final List<dynamic> data = response.data;
    return data.map((json) => StaffPenalty.fromJson(json)).toList();
  }

  Future<PenaltySummary> waivePenalty(String penaltyId, {required double amount, required String reason}) async {
    final response = await _dio.post('/api/v1/penalties/$penaltyId/waive', data: {
      'amount': amount,
      'reason': reason,
    });
    return PenaltySummary.fromJson(response.data);
  }

  // Rules
  Future<List<PenaltyRule>> getRules({bool activeOnly = false}) async {
    final response = await _dio.get('/api/v1/penalties/rules', queryParameters: {'activeOnly': activeOnly});
    final List<dynamic> data = response.data;
    return data.map((json) => PenaltyRule.fromJson(json)).toList();
  }

  Future<PenaltyRule> createRule(PenaltyRuleRequest request) async {
    final response = await _dio.post('/api/v1/penalties/rules', data: request.toJson());
    return PenaltyRule.fromJson(response.data);
  }

  Future<PenaltyRule> updateRule(String id, PenaltyRuleRequest request) async {
    final response = await _dio.put('/api/v1/penalties/rules/$id', data: request.toJson());
    return PenaltyRule.fromJson(response.data);
  }

  Future<void> deleteRule(String id) async {
    await _dio.delete('/api/v1/penalties/rules/$id');
  }
}
