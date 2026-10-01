import 'package:dio/dio.dart';
import '../../../core/networking/api_client.dart';
import 'sms_dto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SmsRepository {
  final Dio _dio;

  SmsRepository(this._dio);

  Future<SmsLogResponseDto> getLogs({
    int page = 0,
    int size = 20,
    String? status,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'size': size,
    };
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final response = await _dio.get(
      '/api/v1/sms-logs',
      queryParameters: queryParams,
    );
    return SmsLogResponseDto.fromJson(response.data);
  }

  Future<void> retrySms(String id) async {
    await _dio.post('/api/v1/sms-logs/$id/retry');
  }

  Future<void> sendCustomSms({
    required String phoneNumber,
    required String message,
  }) async {
    await _dio.post(
      '/api/v1/sms-logs/send',
      data: {
        'phoneNumber': phoneNumber,
        'message': message,
      },
    );
  }
}

final smsRepositoryProvider = Provider<SmsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return SmsRepository(dio);
});
