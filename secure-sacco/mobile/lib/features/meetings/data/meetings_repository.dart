import 'package:dio/dio.dart';
import 'meetings_dto.dart';

class MeetingsRepository {
  final Dio _dio;

  MeetingsRepository(this._dio);

  // ── Member endpoints ──────────────────────────────────────────

  Future<List<MyMeetingSummary>> getMyMeetings() async {
    final response = await _dio.get('/api/v1/meetings/my');
    return (response.data as List).map((e) => MyMeetingSummary.fromJson(e)).toList();
  }

  Future<CheckInResult> checkIn(String meetingId) async {
    final response = await _dio.post('/api/v1/meetings/$meetingId/checkin');
    return CheckInResult.fromJson(response.data);
  }

  Future<CheckInResult> scanAttendance(dynamic meetingId, String token) async {
    final response = await _dio.post('/api/v1/meetings/$meetingId/attendance/scan', data: {'token': token});
    return CheckInResult.fromJson(response.data);
  }

  Future<MeetingInfo> getMeetingInfoByToken(String token) async {
    final response = await _dio.get('/api/v1/meetings/qr/$token');
    return MeetingInfo.fromJson(response.data);
  }

  Future<CheckInResult> checkInByToken(String token) async {
    final response = await _dio.post('/api/v1/meetings/qr/$token/checkin');
    return CheckInResult.fromJson(response.data);
  }

  // ── Staff endpoints ──────────────────────────────────────────

  Future<List<Meeting>> list() async {
    final response = await _dio.get('/api/v1/meetings');
    final data = response.data;
    final content = data['content'] ?? data;
    return (content as List).map((e) => Meeting.fromJson(e)).toList();
  }

  Future<Meeting> get(String id) async {
    final response = await _dio.get('/api/v1/meetings/$id');
    return Meeting.fromJson(response.data);
  }

  Future<Meeting> create(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/v1/meetings', data: data);
    return Meeting.fromJson(response.data);
  }

  Future<Meeting> update(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('/api/v1/meetings/$id', data: data);
    return Meeting.fromJson(response.data);
  }

  Future<Meeting> cancel(String id) async {
    final response = await _dio.post('/api/v1/meetings/$id/cancel');
    return Meeting.fromJson(response.data);
  }

  Future<Meeting> complete(String id) async {
    final response = await _dio.post('/api/v1/meetings/$id/complete');
    return Meeting.fromJson(response.data);
  }

  Future<List<AttendanceRecord>> getAttendance(String id) async {
    final response = await _dio.get('/api/v1/meetings/$id/attendance');
    return (response.data as List).map((e) => AttendanceRecord.fromJson(e)).toList();
  }

  Future<List<AttendanceRecord>> recordAttendance(String id, List<Map<String, dynamic>> records) async {
    final response = await _dio.put('/api/v1/meetings/$id/attendance', data: {'records': records});
    return (response.data as List).map((e) => AttendanceRecord.fromJson(e)).toList();
  }
}
