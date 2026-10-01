import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'settings_dto.dart';

class SettingsRepository {
  final Dio _dio;

  SettingsRepository(this._dio);

  Future<SaccoSettingsResponse> getSettings() async {
    final response = await _dio.get('/api/v1/settings/sacco');
    return SaccoSettingsResponse.fromJson(response.data);
  }

  Future<void> updateCoreSettings(UpdateCoreRequest request) async {
    await _dio.put('/api/v1/settings/sacco/core', data: request.toJson());
  }

  Future<void> updateSecurityPolicy(UpdateSecurityPolicyRequest request) async {
    await _dio.put('/api/v1/settings/sacco/security', data: request.toJson());
  }

  Future<void> updateCommunicationSettings(UpdateCommunicationRequest request) async {
    await _dio.put('/api/v1/settings/sacco/communication', data: request.toJson());
  }

  Future<void> updateFeatureFlags(UpdateFlagsRequest request) async {
    await _dio.put('/api/v1/settings/sacco/flags', data: request.toJson());
  }

  Future<void> updateSavingsSchedule(UpdateSavingsScheduleRequest request) async {
    await _dio.put('/api/v1/settings/sacco/savings-schedule', data: request.toJson());
  }

  Future<void> updateMeetingsSettings(UpdateMeetingsRequest request) async {
    await _dio.put('/api/v1/settings/sacco/meetings', data: request.toJson());
  }

  Future<void> updateLoanSettings(UpdateLoansRequest request) async {
    await _dio.put('/api/v1/settings/sacco/loans', data: request.toJson());
  }
}

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository(ref.watch(dioProvider));
});
