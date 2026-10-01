import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'share_api.dart';
import 'share_models.dart';

final shareApiProvider = Provider<ShareApi>((ref) {
  final dio = ref.watch(dioProvider);
  return ShareApi(dio);
});

final mySharesProvider = FutureProvider.autoDispose<List<ShareAccount>>((ref) async {
  final api = ref.watch(shareApiProvider);
  return api.getMyShares();
});

final shareTransactionsProvider = FutureProvider.family.autoDispose<List<ShareTransaction>, String>((ref, accountId) async {
  final api = ref.watch(shareApiProvider);
  return api.getTransactions(accountId);
});
