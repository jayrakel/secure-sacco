import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'savings_repository.dart';
import 'savings_dto.dart';

final mySavingsBalanceProvider = FutureProvider.autoDispose<SavingsBalanceResponse>((ref) async {
  final repository = ref.watch(savingsRepositoryProvider);
  return repository.getMyBalance();
});

final mySavingsStatementProvider = FutureProvider.autoDispose<List<StatementTransactionResponse>>((ref) async {
  final repository = ref.watch(savingsRepositoryProvider);
  return repository.getMyStatement();
});

final memberSavingsBalanceProvider = FutureProvider.family.autoDispose<SavingsBalanceResponse, String>((ref, memberId) async {
  final repository = ref.watch(savingsRepositoryProvider);
  return repository.getMemberBalance(memberId);
});

final memberSavingsStatementProvider = FutureProvider.family.autoDispose<List<StatementTransactionResponse>, String>((ref, memberId) async {
  final repository = ref.watch(savingsRepositoryProvider);
  return repository.getMemberStatement(memberId);
});

final savingsNotifierProvider = Provider<SavingsNotifier>((ref) {
  return SavingsNotifier(ref.watch(savingsRepositoryProvider), ref);
});

class SavingsNotifier {
  final SavingsRepository _repository;
  final Ref _ref;

  SavingsNotifier(this._repository, this._ref);

  Future<void> submitManualDeposit(ManualTransactionRequest request) async {
    await _repository.manualDeposit(request);
    _ref.invalidate(memberSavingsBalanceProvider(request.memberId));
    _ref.invalidate(memberSavingsStatementProvider(request.memberId));
  }

  Future<void> submitManualWithdrawal(ManualTransactionRequest request) async {
    await _repository.manualWithdrawal(request);
    _ref.invalidate(memberSavingsBalanceProvider(request.memberId));
    _ref.invalidate(memberSavingsStatementProvider(request.memberId));
  }
}
