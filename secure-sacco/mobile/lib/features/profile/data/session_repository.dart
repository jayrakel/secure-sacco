import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';

class SessionRepository {
  final Dio _dio;

  SessionRepository(this._dio);

  Future<List<Map<String, dynamic>>> getUserSessions(String userId) async {
    final response = await _dio.get('/api/v1/sessions/user/$userId');
    return List<Map<String, dynamic>>.from(response.data);
  }

  Future<void> revokeAllUserSessions(String userId) async {
    await _dio.delete('/api/v1/sessions/user/$userId');
  }

  Future<void> revokeSpecificSession(String sessionId) async {
    await _dio.delete('/api/v1/sessions/$sessionId');
  }
}

final sessionRepositoryProvider = Provider<SessionRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return SessionRepository(dio);
});
