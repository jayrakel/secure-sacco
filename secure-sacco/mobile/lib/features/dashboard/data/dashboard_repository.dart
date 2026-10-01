import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'member_dashboard_dto.dart';
import 'staff_dashboard_dto.dart';
import 'statement_dto.dart';

class DashboardRepository {
  final Dio _dio;

  DashboardRepository(this._dio);

  Future<MemberDashboardDto> fetchMemberDashboard() async {
    final response = await _dio.get('/api/v1/dashboard/member');
    return MemberDashboardDto.fromJson(response.data);
  }

  Future<StaffDashboardDto> fetchStaffDashboard() async {
    final response = await _dio.get('/api/v1/dashboard/staff');
    return StaffDashboardDto.fromJson(response.data);
  }

  Future<StatementResponseDto> fetchMemberStatement(String memberId) async {
    final response = await _dio.get('/api/v1/reports/members/$memberId/statement');
    return StatementResponseDto.fromJson(response.data);
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return DashboardRepository(dio);
});
