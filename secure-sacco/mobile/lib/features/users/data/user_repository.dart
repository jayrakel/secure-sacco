import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'user_dto.dart';

class UserRepository {
  final Dio _dio;

  UserRepository(this._dio);

  Future<List<UserDto>> getUsers() async {
    final response = await _dio.get('/api/v1/users');
    return (response.data as List).map((e) => UserDto.fromJson(e)).toList();
  }

  Future<UserDto> getUser(String id) async {
    final response = await _dio.get('/api/v1/users/$id');
    return UserDto.fromJson(response.data);
  }

  Future<UserDto> createUser(CreateUserRequestDto request) async {
    final response = await _dio.post('/api/v1/users', data: request.toJson());
    return UserDto.fromJson(response.data);
  }

  Future<void> updateUserStatus(String id, String status) async {
    await _dio.patch(
      '/api/v1/users/$id/status',
      data: {'status': status},
    );
  }

  Future<void> updateUserRoles(String id, List<String> roleIds) async {
    await _dio.put(
      '/api/v1/users/$id/roles',
      data: {'roleIds': roleIds},
    );
  }

  Future<void> updateUser(String id, String firstName, String lastName, String? phoneNumber) async {
    await _dio.put(
      '/api/v1/users/$id',
      data: {
        'firstName': firstName,
        'lastName': lastName,
        if (phoneNumber != null) 'phoneNumber': phoneNumber,
      },
    );
  }
}

final userRepositoryProvider = Provider<UserRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return UserRepository(dio);
});
