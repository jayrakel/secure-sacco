import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dashboard_repository.dart';
import 'member_dashboard_dto.dart';
import 'staff_dashboard_dto.dart';
import 'statement_dto.dart';
import '../../auth/data/auth_state.dart';

final dashboardMetricsProvider = FutureProvider.autoDispose<MemberDashboardDto>((ref) async {
  final repository = ref.watch(dashboardRepositoryProvider);
  return repository.fetchMemberDashboard();
});

final recentTransactionsProvider = FutureProvider.autoDispose<StatementResponseDto>((ref) async {
  final authState = ref.watch(authControllerProvider);
  if (authState.memberId == null) {
    throw Exception('Member ID not found in session');
  }
  final repository = ref.watch(dashboardRepositoryProvider);
  return repository.fetchMemberStatement(authState.memberId!);
});

final staffDashboardProvider = FutureProvider.autoDispose<StaffDashboardDto>((ref) async {
  final repository = ref.watch(dashboardRepositoryProvider);
  return repository.fetchStaffDashboard();
});
