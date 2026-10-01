import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'dividend_repository.dart';
import 'dividend_dto.dart';

final dividendRepositoryProvider = Provider<DividendRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return DividendRepository(dio);
});

final dividendDeclarationsProvider = FutureProvider.autoDispose<List<DividendDeclaration>>((ref) async {
  final repository = ref.watch(dividendRepositoryProvider);
  return repository.getDeclarations();
});
