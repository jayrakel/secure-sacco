import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';

enum SetupPhase {
  CHANGE_PASSWORD,
  VERIFY_CONTACT,
  CREATE_OFFICERS,
  CONFIGURE_PLATFORM,
  COMPLETE
}

class SetupStatus {
  final SetupPhase phase;
  final bool complete;
  final List<String> missingOfficerRoles;

  SetupStatus({
    required this.phase,
    required this.complete,
    required this.missingOfficerRoles,
  });

  factory SetupStatus.fromJson(Map<String, dynamic> json) {
    // Map string from backend to enum
    SetupPhase phase;
    switch (json['phase']) {
      case 'CHANGE_PASSWORD':
        phase = SetupPhase.CHANGE_PASSWORD;
        break;
      case 'VERIFY_CONTACT':
        phase = SetupPhase.VERIFY_CONTACT;
        break;
      case 'CREATE_OFFICERS':
        phase = SetupPhase.CREATE_OFFICERS;
        break;
      case 'CONFIGURE_PLATFORM':
        phase = SetupPhase.CONFIGURE_PLATFORM;
        break;
      case 'COMPLETE':
        phase = SetupPhase.COMPLETE;
        break;
      default:
        phase = SetupPhase.VERIFY_CONTACT; // Fallback
    }

    return SetupStatus(
      phase: phase,
      complete: json['complete'] as bool? ?? false,
      missingOfficerRoles: (json['missingOfficerRoles'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
    );
  }
}

class SetupApi {
  final Dio _dio;

  SetupApi(this._dio);

  Future<SetupStatus> getStatus() async {
    final response = await _dio.get('/api/v1/setup/status');
    return SetupStatus.fromJson(response.data);
  }

  Future<void> sendEmailVerification() async {
    await _dio.post('/api/v1/auth/verify/email/send');
  }

  Future<void> confirmEmail(String token) async {
    await _dio.post('/api/v1/auth/verify/email/confirm', data: {'token': token});
  }

  Future<void> initializeSacco(String name, String prefix, int padLength, double registrationFee) async {
    await _dio.post('/api/v1/settings/sacco/initialize', data: {
      'saccoName': name,
      'prefix': prefix,
      'padLength': padLength,
      'registrationFee': registrationFee,
    });
  }

  Future<void> updateFlags(Map<String, bool> flags) async {
    await _dio.put('/api/v1/settings/sacco/flags', data: {'flags': flags});
  }

  Future<List<dynamic>> getRoles() async {
    final response = await _dio.get('/api/v1/roles');
    return response.data;
  }

  Future<void> createOfficer({
    required String firstName,
    required String lastName,
    required String email,
    String? phoneNumber,
    required String roleId,
  }) async {
    await _dio.post('/api/v1/users', data: {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      if (phoneNumber != null && phoneNumber.isNotEmpty) 'phoneNumber': phoneNumber,
      'password': 'Sacco@ChangeMeNow1',
      'roleIds': [roleId],
    });
  }
}

final setupApiProvider = Provider<SetupApi>((ref) {
  return SetupApi(ref.watch(dioProvider));
});
