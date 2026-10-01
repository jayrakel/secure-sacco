import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'loan_dto.dart';
import 'loan_repository.dart';

final loanRepositoryProvider = Provider<LoanRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return LoanRepository(dio);
});

// ── Member Providers ──────────────────────────────────────────

final activeLoanProductsProvider = FutureProvider.autoDispose<List<LoanProduct>>((ref) {
  final repo = ref.watch(loanRepositoryProvider);
  return repo.getProducts();
});

final myLoanApplicationsProvider = FutureProvider.autoDispose<List<LoanApplication>>((ref) {
  final repo = ref.watch(loanRepositoryProvider);
  return repo.getMyApplications();
});

final loanSummaryProvider = FutureProvider.family.autoDispose<LoanSummary, String>((ref, id) {
  final repo = ref.watch(loanRepositoryProvider);
  return repo.getLoanSummary(id);
});

final loanEligibilityProvider = FutureProvider.autoDispose<LoanEligibility>((ref) {
  final repo = ref.watch(loanRepositoryProvider);
  return repo.getEligibility();
});

final myGuarantorRequestsProvider = FutureProvider.autoDispose<List<MyGuarantorRequestResponse>>((ref) {
  final repo = ref.watch(loanRepositoryProvider);
  return repo.getMyGuarantorRequests();
});

// ── Staff Providers ───────────────────────────────────────────

final allLoanApplicationsProvider = FutureProvider.autoDispose<List<LoanApplication>>((ref) {
  final repo = ref.watch(loanRepositoryProvider);
  return repo.getAllApplications();
});

final allLoanProductsProvider = FutureProvider.autoDispose<List<LoanProduct>>((ref) {
  final repo = ref.watch(loanRepositoryProvider);
  return repo.getAllProducts();
});
