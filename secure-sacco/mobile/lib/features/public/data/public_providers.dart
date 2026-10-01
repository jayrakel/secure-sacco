import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'public_api.dart';
import 'public_models.dart';

final publicApiProvider = Provider<PublicApi>((ref) {
  final dio = ref.watch(dioProvider);
  return PublicApi(dio);
});

final landingDataProvider = FutureProvider<LandingPageData>((ref) async {
  final api = ref.watch(publicApiProvider);
  return api.getLandingData();
});
