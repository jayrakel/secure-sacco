import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_repository.dart';

enum AuthStatus {
  initial,
  unauthenticated,
  requiresMfa,
  requiresContactVerification,
  authenticated,
}

class AuthState {
  final AuthStatus status;
  final String? mfaToken;
  final String? userId;
  final String? memberId;
  final List<String> roles;
  final List<String> permissions;
  final bool mustChangePassword;
  final Map<String, dynamic>? user;

  // Which contact methods still need verification
  final bool emailVerified;
  final bool phoneVerified;

  AuthState({
    this.status = AuthStatus.initial,
    this.mfaToken,
    this.userId,
    this.memberId,
    this.roles = const [],
    this.permissions = const [],
    this.mustChangePassword = false,
    this.user,
    this.emailVerified = true,
    this.phoneVerified = true,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? mfaToken,
    String? userId,
    String? memberId,
    List<String>? roles,
    List<String>? permissions,
    bool? mustChangePassword,
    Map<String, dynamic>? user,
    bool? emailVerified,
    bool? phoneVerified,
  }) {
    return AuthState(
      status: status ?? this.status,
      mfaToken: mfaToken ?? this.mfaToken,
      userId: userId ?? this.userId,
      memberId: memberId ?? this.memberId,
      roles: roles ?? this.roles,
      permissions: permissions ?? this.permissions,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      user: user ?? this.user,
      emailVerified: emailVerified ?? this.emailVerified,
      phoneVerified: phoneVerified ?? this.phoneVerified,
    );
  }
}

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(() => checkSession());
    return AuthState();
  }

  AuthRepository get authRepository => ref.read(authRepositoryProvider);

  Future<void> checkSession() async {
    try {
      final data = await authRepository.checkSession();
      if (data != null && data['id'] != null) {
        final user = data;
        final userId = user['id'] as String?;
        final memberId = user['memberId'] as String?;
        final roles = (user['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        final permissions = (user['permissions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        final mustChangePassword = user['mustChangePassword'] == true;
        final emailVerified = user['emailVerified'] != false; // default true if missing
        final phoneVerified = user['phoneVerified'] != false; // default true if missing

        // If a contact method is not verified, require verification before access
        final needsVerification = !emailVerified || !phoneVerified;

        state = state.copyWith(
          status: needsVerification
              ? AuthStatus.requiresContactVerification
              : AuthStatus.authenticated,
          userId: userId,
          memberId: memberId,
          roles: roles,
          permissions: permissions,
          mustChangePassword: mustChangePassword,
          user: user,
          emailVerified: emailVerified,
          phoneVerified: phoneVerified,
        );
      } else {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          roles: [],
          permissions: [],
          mustChangePassword: false,
          user: null,
          emailVerified: true,
          phoneVerified: true,
        );
      }
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        roles: [],
        permissions: [],
        mustChangePassword: false,
        user: null,
        emailVerified: true,
        phoneVerified: true,
      );
    }
  }

  Future<void> login(String identifier, String password) async {
    try {
      final response = await authRepository.login(identifier, password);
      if (response.status == 202) {
        state = state.copyWith(status: AuthStatus.requiresMfa, mfaToken: response.mfaToken);
      } else if (response.status == 200) {
        await checkSession();
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> verifyMfa(String code) async {
    if (state.mfaToken == null) return;
    try {
      final success = await authRepository.verifyMfa(state.mfaToken!, code);
      if (success) {
        await checkSession();
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Called by the verification screen after a successful OTP verify.
  /// Re-fetches session which should now have emailVerified/phoneVerified = true.
  Future<void> refreshAfterVerification() async {
    await checkSession();
  }

  Future<void> logout() async {
    try {
      await authRepository.logout();
    } catch (_) {
      // Ignore network errors on logout, we still want to kill local session
    }
    logoutLocal();
  }

  void logoutLocal() {
    state = AuthState();
  }
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(() {
  return AuthController();
});
