import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/networking/api_client.dart';

class NotificationSettings {
  final bool emailEnabled;
  final bool smsEnabled;
  final bool notifyOnGuarantorRequests;
  final bool notifyOnLoanUpdates;
  final bool notifyOnTransactions;

  NotificationSettings({
    required this.emailEnabled,
    required this.smsEnabled,
    required this.notifyOnGuarantorRequests,
    required this.notifyOnLoanUpdates,
    required this.notifyOnTransactions,
  });

  factory NotificationSettings.fromJson(Map<String, dynamic> json) {
    return NotificationSettings(
      emailEnabled: json['emailEnabled'] ?? true,
      smsEnabled: json['smsEnabled'] ?? true,
      notifyOnGuarantorRequests: json['notifyOnGuarantorRequests'] ?? true,
      notifyOnLoanUpdates: json['notifyOnLoanUpdates'] ?? true,
      notifyOnTransactions: json['notifyOnTransactions'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'emailEnabled': emailEnabled,
      'smsEnabled': smsEnabled,
      'notifyOnGuarantorRequests': notifyOnGuarantorRequests,
      'notifyOnLoanUpdates': notifyOnLoanUpdates,
      'notifyOnTransactions': notifyOnTransactions,
    };
  }

  NotificationSettings copyWith({
    bool? emailEnabled,
    bool? smsEnabled,
    bool? notifyOnGuarantorRequests,
    bool? notifyOnLoanUpdates,
    bool? notifyOnTransactions,
  }) {
    return NotificationSettings(
      emailEnabled: emailEnabled ?? this.emailEnabled,
      smsEnabled: smsEnabled ?? this.smsEnabled,
      notifyOnGuarantorRequests: notifyOnGuarantorRequests ?? this.notifyOnGuarantorRequests,
      notifyOnLoanUpdates: notifyOnLoanUpdates ?? this.notifyOnLoanUpdates,
      notifyOnTransactions: notifyOnTransactions ?? this.notifyOnTransactions,
    );
  }
}

class NotificationSettingsRepository {
  final Dio _dio;

  NotificationSettingsRepository(this._dio);

  Future<NotificationSettings> getSettings() async {
    final response = await _dio.get('/api/v1/users/me/notification-settings');
    return NotificationSettings.fromJson(response.data);
  }

  Future<NotificationSettings> updateSettings(NotificationSettings settings) async {
    final response = await _dio.patch(
      '/api/v1/users/me/notification-settings',
      data: settings.toJson(),
    );
    return NotificationSettings.fromJson(response.data);
  }
}

final notificationSettingsRepositoryProvider = Provider<NotificationSettingsRepository>((ref) {
  return NotificationSettingsRepository(ref.watch(dioProvider));
});

final notificationSettingsProvider = FutureProvider.autoDispose<NotificationSettings>((ref) async {
  final repo = ref.watch(notificationSettingsRepositoryProvider);
  return repo.getSettings();
});
