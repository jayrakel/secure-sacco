import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'penalty_dto.dart';
import 'penalty_repository.dart';

final penaltyRepositoryProvider = Provider<PenaltyRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return PenaltyRepository(dio);
});

final myPenaltiesProvider = FutureProvider.autoDispose<List<PenaltySummary>>((ref) async {
  final repo = ref.watch(penaltyRepositoryProvider);
  return await repo.getMyOpenPenalties();
});

final staffPenaltiesProvider = FutureProvider.autoDispose<List<StaffPenalty>>((ref) async {
  final repo = ref.watch(penaltyRepositoryProvider);
  return await repo.getAllOpenPenalties();
});

final penaltyRulesProvider = FutureProvider.autoDispose<List<PenaltyRule>>((ref) async {
  final repo = ref.watch(penaltyRepositoryProvider);
  return await repo.getRules();
});
