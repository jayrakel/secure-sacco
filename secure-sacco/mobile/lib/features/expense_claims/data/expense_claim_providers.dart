import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'expense_claim_repository.dart';
import 'expense_claim_dto.dart';

final expenseClaimRepositoryProvider = Provider<ExpenseClaimRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ExpenseClaimRepository(dio);
});

final myExpenseClaimsProvider = FutureProvider.autoDispose<List<ExpenseClaimResponse>>((ref) async {
  final repo = ref.watch(expenseClaimRepositoryProvider);
  return repo.getMyClaims();
});

final allExpenseClaimsProvider = FutureProvider.autoDispose<List<ExpenseClaimResponse>>((ref) async {
  final repo = ref.watch(expenseClaimRepositoryProvider);
  return repo.getAllClaims();
});
