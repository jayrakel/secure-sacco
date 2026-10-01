import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http_parser/http_parser.dart';
import '../../../core/networking/api_client.dart';

class ProfileRepository {
  final Dio _dio;

  ProfileRepository(this._dio);

  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/api/v1/auth/profile');
    return response.data;
  }

  Future<Map<String, dynamic>> updateProfile({
    required String firstName,
    required String lastName,
    String? phoneNumber,
    String? otp,
  }) async {
    final response = await _dio.put('/api/v1/auth/profile', data: {
      'firstName': firstName,
      'lastName': lastName,
      if (phoneNumber != null) 'phoneNumber': phoneNumber,
      if (otp != null) 'otp': otp,
    });
    return response.data;
  }

  Future<void> requestProfileChangeOtp() async {
    await _dio.post('/api/v1/auth/profile/authorize-change');
  }

  Future<void> uploadPhoto(File photo) async {
    String fileName = photo.path.split('/').last;
    if (fileName.isEmpty) fileName = 'photo.jpg';
    
    // Explicitly set media type since some android cache files lack extensions
    final contentType = MediaType('image', 'jpeg');

    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(
        photo.path, 
        filename: fileName,
        contentType: contentType,
      ),
    });
    
    // Do not override Content-Type header in Options! Dio sets the multipart boundary automatically.
    // If you override it with 'multipart/form-data', it will strip the boundary, breaking the request!
    await _dio.post(
      '/api/v1/auth/profile/photo',
      data: formData,
    );
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _dio.post('/api/v1/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  Future<Map<String, dynamic>> getMfaSetup() async {
    final response = await _dio.get('/api/v1/auth/mfa/setup');
    return response.data;
  }

  Future<void> enableMfa(String code) async {
    await _dio.post('/api/v1/auth/mfa/enable', data: {'code': code});
  }

  Future<void> disableMfa() async {
    await _dio.post('/api/v1/auth/mfa/disable');
  }
}

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ProfileRepository(dio);
});
