import 'package:dio/dio.dart';
import '../../../core/networking/api_client.dart';
import 'audit_dto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuditRepository {
  final Dio _dio;

  AuditRepository(this._dio);

  Future<AuditLogResponseDto> getLogs({
    int page = 0,
    int size = 50,
    String? actorEmail,
    String? eventType,
    String? from,
    String? to,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'size': size,
    };
    if (actorEmail != null && actorEmail.isNotEmpty) {
      queryParams['actorEmail'] = actorEmail;
    }
    if (eventType != null && eventType.isNotEmpty) {
      queryParams['eventType'] = eventType;
    }
    if (from != null && from.isNotEmpty) {
      queryParams['from'] = from;
    }
    if (to != null && to.isNotEmpty) {
      queryParams['to'] = to;
    }

    final response = await _dio.get(
      '/api/v1/audit/logs',
      queryParameters: queryParams,
    );
    return AuditLogResponseDto.fromJson(response.data);
  }
}

final auditRepositoryProvider = Provider<AuditRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return AuditRepository(dio);
});
