import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'asset_dto.dart';
import 'asset_repository.dart';

final assetsProvider = FutureProvider.family<List<AssetResponse>, AssetStatus?>((ref, status) async {
  final repository = ref.watch(assetRepositoryProvider);
  return await repository.getAssets(status: status);
});

final assetDetailProvider = FutureProvider.family<AssetResponse, String>((ref, id) async {
  final repository = ref.watch(assetRepositoryProvider);
  return await repository.getAssetById(id);
});

class AssetController extends AsyncNotifier<void> {
  AssetRepository get _repository => ref.read(assetRepositoryProvider);

  @override
  Future<void> build() async {}

  Future<bool> registerAsset(RegisterAssetRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.registerAsset(request);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> updateAsset(String id, UpdateAssetRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateAsset(id, request);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> updateAssetStatus(String id, UpdateAssetStatusRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateAssetStatus(id, request);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}

final assetControllerProvider = AsyncNotifierProvider<AssetController, void>(() {
  return AssetController();
});
