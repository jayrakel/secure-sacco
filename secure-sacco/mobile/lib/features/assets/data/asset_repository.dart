import 'package:dio/dio.dart';
import '../../../core/networking/api_client.dart';
import 'asset_dto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final assetRepositoryProvider = Provider<AssetRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return AssetRepository(dio);
});

class AssetRepository {
  final Dio _dio;

  AssetRepository(this._dio);

  Future<List<AssetResponse>> getAssets({AssetStatus? status}) async {
    final Map<String, dynamic> queryParams = {};
    if (status != null) {
      queryParams['status'] = status.name;
    }

    final response = await _dio.get('/api/v1/assets', queryParameters: queryParams);
    final List<dynamic> data = response.data;
    return data.map((json) => AssetResponse.fromJson(json)).toList();
  }

  Future<AssetResponse> getAssetById(String id) async {
    final response = await _dio.get('/api/v1/assets/$id');
    return AssetResponse.fromJson(response.data);
  }

  Future<AssetResponse> registerAsset(RegisterAssetRequest request) async {
    final response = await _dio.post('/api/v1/assets', data: request.toJson());
    return AssetResponse.fromJson(response.data);
  }

  Future<AssetResponse> updateAsset(String id, UpdateAssetRequest request) async {
    final response = await _dio.put('/api/v1/assets/$id', data: request.toJson());
    return AssetResponse.fromJson(response.data);
  }

  Future<AssetResponse> updateAssetStatus(String id, UpdateAssetStatusRequest request) async {
    final response = await _dio.patch('/api/v1/assets/$id/status', data: request.toJson());
    return AssetResponse.fromJson(response.data);
  }
}
