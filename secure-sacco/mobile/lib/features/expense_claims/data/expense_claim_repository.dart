import 'package:dio/dio.dart';
import 'expense_claim_dto.dart';

class ExpenseClaimRepository {
  final Dio _dio;

  ExpenseClaimRepository(this._dio);

  Future<List<ExpenseClaimResponse>> getMyClaims() async {
    final response = await _dio.get('/api/v1/expense-claims/my');
    return (response.data as List).map((json) => ExpenseClaimResponse.fromJson(json)).toList();
  }

  Future<ExpenseClaimResponse> submitMyClaim(MemberSubmitExpenseClaimRequest request) async {
    final response = await _dio.post(
      '/api/v1/expense-claims/my',
      data: request.toJson(),
    );
    return ExpenseClaimResponse.fromJson(response.data);
  }

  Future<List<ExpenseClaimResponse>> getAllClaims() async {
    final response = await _dio.get('/api/v1/expense-claims/staff');
    return (response.data as List).map((json) => ExpenseClaimResponse.fromJson(json)).toList();
  }

  Future<ExpenseClaimResponse> submitClaim(SubmitExpenseClaimRequest request) async {
    final response = await _dio.post(
      '/api/v1/expense-claims',
      data: request.toJson(),
    );
    return ExpenseClaimResponse.fromJson(response.data);
  }

  Future<ExpenseClaimResponse> reviewClaim(String id, ReviewExpenseClaimRequest request) async {
    final response = await _dio.post(
      '/api/v1/expense-claims/$id/review',
      data: request.toJson(),
    );
    return ExpenseClaimResponse.fromJson(response.data);
  }
}
