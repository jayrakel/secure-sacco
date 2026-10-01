import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'setup_api.dart';

final setupControllerProvider = AsyncNotifierProvider<SetupController, SetupStatus>(() {
  return SetupController();
});

class SetupController extends AsyncNotifier<SetupStatus> {
  SetupApi get _api => ref.read(setupApiProvider);

  @override
  Future<SetupStatus> build() async {
    return _api.getStatus();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      final status = await _api.getStatus();
      state = AsyncValue.data(status);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> sendEmailVerification() async {
    await _api.sendEmailVerification();
  }

  Future<void> confirmEmail(String token) async {
    await _api.confirmEmail(token);
    await refresh();
  }

  Future<List<dynamic>> getRoles() async {
    return _api.getRoles();
  }

  Future<void> createOfficer({
    required String firstName,
    required String lastName,
    required String email,
    String? phoneNumber,
    required String roleId,
  }) async {
    await _api.createOfficer(
      firstName: firstName,
      lastName: lastName,
      email: email,
      phoneNumber: phoneNumber,
      roleId: roleId,
    );
  }

  Future<void> savePlatformConfig({
    required String saccoName,
    required String prefix,
    required int padLength,
    required double registrationFee,
    required Map<String, bool> flags,
  }) async {
    await _api.initializeSacco(saccoName, prefix, padLength, registrationFee);
    await _api.updateFlags(flags);
    await refresh();
  }
}
