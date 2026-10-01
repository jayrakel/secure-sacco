import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'session_repository.dart';

class SessionState {
  final bool isLoading;
  final String? error;
  final List<Map<String, dynamic>> sessions;

  SessionState({
    this.isLoading = false,
    this.error,
    this.sessions = const [],
  });

  SessionState copyWith({
    bool? isLoading,
    String? error,
    List<Map<String, dynamic>>? sessions,
  }) {
    return SessionState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      sessions: sessions ?? this.sessions,
    );
  }
}

class SessionController extends Notifier<SessionState> {
  @override
  SessionState build() {
    return SessionState();
  }

  SessionRepository get _repository => ref.read(sessionRepositoryProvider);

  Future<void> fetchSessions(String userId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final sessions = await _repository.getUserSessions(userId);
      state = state.copyWith(isLoading: false, sessions: sessions);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Failed to fetch sessions");
    }
  }

  Future<void> revokeSession(String userId, String sessionId) async {
    try {
      await _repository.revokeSpecificSession(sessionId);
      await fetchSessions(userId);
    } catch (e) {
      state = state.copyWith(error: "Failed to revoke session");
    }
  }

  Future<void> revokeAll(String userId) async {
    try {
      await _repository.revokeAllUserSessions(userId);
      await fetchSessions(userId);
    } catch (e) {
      state = state.copyWith(error: "Failed to revoke all sessions");
    }
  }
}

final sessionControllerProvider = NotifierProvider<SessionController, SessionState>(() {
  return SessionController();
});
