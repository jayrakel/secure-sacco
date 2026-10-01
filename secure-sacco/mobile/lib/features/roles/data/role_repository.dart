import 'package:dio/dio.dart';
import 'package:betterlink_connect/features/roles/data/role_dto.dart';

class RoleRepository {
  final Dio _dio;

  RoleRepository(this._dio);

  Future<List<RoleDto>> getAllRoles() async {
    final response = await _dio.get('/api/v1/roles');
    return (response.data as List).map((json) => RoleDto.fromJson(json)).toList();
  }

  Future<List<PermissionDto>> getAllPermissions() async {
    final response = await _dio.get('/api/v1/permissions');
    return (response.data as List).map((json) => PermissionDto.fromJson(json)).toList();
  }

  Future<RoleDto> createRole(CreateRoleRequestDto request) async {
    final response = await _dio.post('/api/v1/roles', data: request.toJson());
    return RoleDto.fromJson(response.data);
  }

  Future<RoleDto> updateRolePermissions(String roleId, List<String> permissionIds) async {
    final response = await _dio.put(
      '/api/v1/roles/$roleId/permissions',
      data: {'permissionIds': permissionIds},
    );
    return RoleDto.fromJson(response.data);
  }
}
