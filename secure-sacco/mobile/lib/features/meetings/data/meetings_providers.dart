import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/networking/api_client.dart';
import 'meetings_dto.dart';
import 'meetings_repository.dart';

final meetingsRepositoryProvider = Provider<MeetingsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return MeetingsRepository(dio);
});

// Member facing
final myMeetingsProvider = FutureProvider.autoDispose<List<MyMeetingSummary>>((ref) async {
  final repo = ref.watch(meetingsRepositoryProvider);
  return repo.getMyMeetings();
});

// Staff facing
final meetingsListProvider = FutureProvider.autoDispose<List<Meeting>>((ref) async {
  final repo = ref.watch(meetingsRepositoryProvider);
  return repo.list();
});

final meetingAttendanceProvider = FutureProvider.autoDispose.family<List<AttendanceRecord>, String>((ref, id) async {
  final repo = ref.watch(meetingsRepositoryProvider);
  return repo.getAttendance(id);
});

final meetingInfoProvider = FutureProvider.autoDispose.family<MeetingInfo, String>((ref, token) async {
  final repo = ref.watch(meetingsRepositoryProvider);
  return repo.getMeetingInfoByToken(token);
});
