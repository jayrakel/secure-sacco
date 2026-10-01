import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'settings_repository.dart';
import 'settings_dto.dart';

final saccoSettingsProvider = FutureProvider.autoDispose<SaccoSettingsResponse>((ref) async {
  final repository = ref.watch(settingsRepositoryProvider);
  return repository.getSettings();
});

class SettingsNotifier extends AsyncNotifier<void> {
  SettingsRepository get _repository => ref.read(settingsRepositoryProvider);

  @override
  Future<void> build() async {}

  Future<void> updateCoreSettings(UpdateCoreRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateCoreSettings(request);
      ref.invalidate(saccoSettingsProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateSecurityPolicy(UpdateSecurityPolicyRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateSecurityPolicy(request);
      ref.invalidate(saccoSettingsProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateCommunicationSettings(UpdateCommunicationRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateCommunicationSettings(request);
      ref.invalidate(saccoSettingsProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateFeatureFlags(UpdateFlagsRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateFeatureFlags(request);
      ref.invalidate(saccoSettingsProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateSavingsSchedule(UpdateSavingsScheduleRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateSavingsSchedule(request);
      ref.invalidate(saccoSettingsProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateMeetingsSettings(UpdateMeetingsRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateMeetingsSettings(request);
      ref.invalidate(saccoSettingsProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateLoanSettings(UpdateLoansRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateLoanSettings(request);
      ref.invalidate(saccoSettingsProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final settingsNotifierProvider = AsyncNotifierProvider<SettingsNotifier, void>(() {
  return SettingsNotifier();
});
