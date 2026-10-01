import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'profile_repository.dart';

class ProfileState {
  final bool isLoading;
  final String? error;
  final Map<String, dynamic>? profile;

  ProfileState({
    this.isLoading = false,
    this.error,
    this.profile,
  });

  ProfileState copyWith({
    bool? isLoading,
    String? error,
    Map<String, dynamic>? profile,
  }) {
    return ProfileState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      profile: profile ?? this.profile,
    );
  }
}

class ProfileController extends Notifier<ProfileState> {
  @override
  ProfileState build() {
    return ProfileState();
  }

  ProfileRepository get _repository => ref.read(profileRepositoryProvider);

  Future<void> fetchProfile() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final profile = await _repository.getProfile();
      state = state.copyWith(isLoading: false, profile: profile);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Failed to fetch profile");
    }
  }

  Future<void> updateProfile({
    required String firstName,
    required String lastName,
    String? phoneNumber,
    String? otp,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repository.updateProfile(
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        otp: otp,
      );
      await fetchProfile();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Failed to update profile");
      throw e;
    }
  }

  Future<void> requestProfileChangeOtp() async {
    try {
      await _repository.requestProfileChangeOtp();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> uploadPhoto(File photo) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repository.uploadPhoto(photo);
      await fetchProfile();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Failed to update profile");
      rethrow;
    }
  }
}

final profileControllerProvider = NotifierProvider<ProfileController, ProfileState>(() {
  return ProfileController();
});
