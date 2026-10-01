import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'obligation_dto.dart';
import 'obligation_repository.dart';

final complianceReportProvider = FutureProvider.autoDispose.family<PagedObligationComplianceResponse, int>((ref, page) async {
  final repo = ref.watch(obligationRepositoryProvider);
  return repo.getComplianceReport(page: page);
});

final myObligationsProvider = FutureProvider.autoDispose<List<ObligationResponse>>((ref) async {
  final repo = ref.watch(obligationRepositoryProvider);
  return repo.getMyObligations();
});

final myObligationsHistoryProvider = FutureProvider.autoDispose.family<PagedObligationPeriodResponse, int>((ref, page) async {
  final repo = ref.watch(obligationRepositoryProvider);
  return repo.getMyHistory(page: page);
});

final triggerEvaluationProvider = FutureProvider.autoDispose<void>((ref) async {
  final repo = ref.watch(obligationRepositoryProvider);
  return repo.triggerEvaluation();
});
