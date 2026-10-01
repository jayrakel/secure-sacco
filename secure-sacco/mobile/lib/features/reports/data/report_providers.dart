import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'report_dto.dart';
import 'report_repository.dart';

final reportRepositoryProvider = Provider<ReportRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ReportRepository(dio);
});

final mySummaryProvider = FutureProvider.autoDispose<MemberMiniSummaryDto>((ref) {
  final repository = ref.watch(reportRepositoryProvider);
  return repository.getMySummary();
});

final loanArrearsProvider = FutureProvider.autoDispose<List<LoanArrearsDto>>((ref) {
  final repository = ref.watch(reportRepositoryProvider);
  return repository.getLoanArrears();
});

final dailyCollectionsProvider = FutureProvider.family.autoDispose<DailyCollectionDto, String?>((ref, date) {
  final repository = ref.watch(reportRepositoryProvider);
  return repository.getDailyCollections(date);
});

final dailyCollectionLinesProvider = FutureProvider.family.autoDispose<List<PaymentLineDto>, String?>((ref, date) {
  final repository = ref.watch(reportRepositoryProvider);
  return repository.getDailyCollectionLines(date);
});

class MemberStatementArgs {
  final String memberId;
  final String? from;
  final String? to;
  MemberStatementArgs(this.memberId, {this.from, this.to});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MemberStatementArgs &&
          runtimeType == other.runtimeType &&
          memberId == other.memberId &&
          from == other.from &&
          to == other.to;

  @override
  int get hashCode => memberId.hashCode ^ from.hashCode ^ to.hashCode;
}

final memberStatementProvider = FutureProvider.family.autoDispose<StatementResponseDto, MemberStatementArgs>((ref, args) {
  final repository = ref.watch(reportRepositoryProvider);
  return repository.getMemberStatement(args.memberId, from: args.from, to: args.to);
});

class IncomeReportArgs {
  final String from;
  final String to;
  IncomeReportArgs(this.from, this.to);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is IncomeReportArgs &&
          runtimeType == other.runtimeType &&
          from == other.from &&
          to == other.to;

  @override
  int get hashCode => from.hashCode ^ to.hashCode;
}

final incomeReportProvider = FutureProvider.family.autoDispose<IncomeReportDto, IncomeReportArgs>((ref, args) {
  final repository = ref.watch(reportRepositoryProvider);
  return repository.getIncomeReport(args.from, args.to);
});

class GeneralStatementArgs {
  final String? from;
  final String? to;
  final String? accountCode;
  GeneralStatementArgs({this.from, this.to, this.accountCode});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GeneralStatementArgs &&
          runtimeType == other.runtimeType &&
          from == other.from &&
          to == other.to &&
          accountCode == other.accountCode;

  @override
  int get hashCode => from.hashCode ^ to.hashCode ^ accountCode.hashCode;
}

final generalStatementProvider = FutureProvider.family.autoDispose<GeneralStatementDto, GeneralStatementArgs>((ref, args) {
  final repository = ref.watch(reportRepositoryProvider);
  return repository.getGeneralStatement(from: args.from, to: args.to, accountCode: args.accountCode);
});
