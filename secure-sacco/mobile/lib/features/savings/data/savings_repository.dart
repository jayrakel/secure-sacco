import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'savings_dto.dart';

final savingsRepositoryProvider = Provider<SavingsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return SavingsRepository(dio);
});

class SavingsRepository {
  final Dio _dio;

  SavingsRepository(this._dio);

  // Member: Get own balance
  Future<SavingsBalanceResponse> getMyBalance() async {
    final response = await _dio.get('/api/v1/savings/me/balance');
    return SavingsBalanceResponse.fromJson(response.data);
  }

  // Member: Get own statement
  Future<List<StatementTransactionResponse>> getMyStatement() async {
    final response = await _dio.get('/api/v1/savings/me/statement');
    return (response.data as List).map((json) => StatementTransactionResponse.fromJson(json)).toList();
  }

  // Admin: Get member's statement
  Future<List<StatementTransactionResponse>> getMemberStatement(String memberId) async {
    final response = await _dio.get('/api/v1/savings/members/$memberId/statement');
    return (response.data as List).map((json) => StatementTransactionResponse.fromJson(json)).toList();
  }
  
  // Admin: Get member's balance
  Future<SavingsBalanceResponse> getMemberBalance(String memberId) async {
    // There is no specific balance endpoint for admins in the backend,
    // so we derive the balance from the most recent statement transaction.
    final statement = await getMemberStatement(memberId);
    if (statement.isEmpty) {
      return SavingsBalanceResponse(availableBalance: 0.0, accountStatus: 'ACTIVE');
    }
    // Statement is reversed (newest first), so index 0 has the final running balance.
    return SavingsBalanceResponse(
      availableBalance: statement.first.runningBalance, 
      accountStatus: 'ACTIVE' // Default status, as we can't reliably get the true status from the statement endpoint
    );
  }

  // Admin: Manual Deposit
  Future<StatementTransactionResponse> manualDeposit(ManualTransactionRequest request) async {
    final response = await _dio.post('/api/v1/savings/deposits/manual', data: request.toJson());
    return StatementTransactionResponse.fromJson(response.data);
  }

  // Admin: Manual Withdrawal
  Future<StatementTransactionResponse> manualWithdrawal(ManualTransactionRequest request) async {
    final response = await _dio.post('/api/v1/savings/withdrawals/manual', data: request.toJson());
    return StatementTransactionResponse.fromJson(response.data);
  }
}
