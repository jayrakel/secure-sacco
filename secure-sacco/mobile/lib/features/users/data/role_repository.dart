import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'role_dto.dart';

class RoleRepository {
  final Dio _dio;

  RoleRepository(this._dio);

  Future<List<RoleDto>> getRoles() async {
    final response = await _dio.get('/api/v1/roles');
    return (response.data as List).map((e) => RoleDto.fromJson(e)).toList();
  }
}

final roleRepositoryProvider = Provider<RoleRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return RoleRepository(dio);
});
