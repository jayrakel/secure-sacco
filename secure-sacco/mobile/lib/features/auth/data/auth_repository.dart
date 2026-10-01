import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';

class LoginResponse {
  final int status;
  final String? mfaToken;
  
  LoginResponse({required this.status, this.mfaToken});
}

class AuthRepository {
  final Dio _dio;

  AuthRepository(this._dio);

  Future<LoginResponse> login(String identifier, String password) async {
    try {
      final response = await _dio.post(
        '/api/v1/auth/login',
        data: {
          'identifier': identifier,
          'password': password,
        },
      );
      
      if (response.statusCode == 202) {
        return LoginResponse(
          status: 202, 
          mfaToken: response.data['mfaToken'],
        );
      }
      
      return LoginResponse(status: 200);
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> verifyMfa(String mfaToken, String code) async {
    try {
      final response = await _dio.post(
        '/api/v1/auth/login/mfa',
        data: {
          'mfaToken': mfaToken,
          'code': code,
        },
      );
      return response.statusCode == 200;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> checkSession() async {
    try {
      final response = await _dio.get('/api/v1/auth/me');
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<void> logout() async {
    await _dio.post('/api/v1/auth/logout');
  }

  Future<void> forgotPassword(String email) async {
    await _dio.post('/api/v1/auth/password/forgot', data: {'email': email});
  }

  Future<void> resetPassword(String token, String newPassword) async {
    await _dio.post('/api/v1/auth/password/reset', data: {
      'token': token,
      'newPassword': newPassword,
    });
  }

  Future<Map<String, dynamic>> verifyActivationEmail(String token) async {
    final response = await _dio.post('/api/v1/auth/activation/verify-email', data: {'token': token});
    return response.data;
  }

  Future<void> completeActivation({
    required String token,
    required String otp,
    required String newPassword,
  }) async {
    await _dio.post('/api/v1/auth/activation/complete', data: {
      'token': token,
      'otp': otp,
      'newPassword': newPassword,
    });
  }

  Future<void> resendActivationEmail(String email) async {
    await _dio.post('/api/v1/auth/activation/email/send', data: {'email': email});
  }

  Future<void> resendOtp(String email) async {
    await _dio.post('/api/v1/auth/activation/otp/send', data: {'email': email});
  }

  // ── Contact Verification (for already-authenticated users) ──────────────────

  /// Send a verification link to the user's email (no body needed — session identifies user).
  Future<void> sendEmailVerification() async {
    await _dio.post('/api/v1/auth/verify/email/send');
  }

  /// Confirm email using the token from the verification link.
  Future<void> confirmEmail(String token) async {
    await _dio.post('/api/v1/auth/verify/email/confirm', data: {'token': token});
  }

  /// Send a 6-digit OTP to the user's registered phone (no body needed).
  Future<void> sendPhoneOtp() async {
    await _dio.post('/api/v1/auth/verify/phone/send');
  }

  /// Confirm the phone OTP.
  Future<void> confirmPhone(String otp) async {
    await _dio.post('/api/v1/auth/verify/phone/confirm', data: {'token': otp});
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return AuthRepository(dio);
});
