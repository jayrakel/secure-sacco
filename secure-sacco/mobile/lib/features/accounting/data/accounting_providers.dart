import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'accounting_repository.dart';
import 'account_dto.dart';
import 'journal_entry_dto.dart';
import 'accounting_report_dtos.dart';
import 'reconciliation_dto.dart';
import 'financial_year_dto.dart';
import 'sacco_expense_dto.dart';

final accountsProvider = FutureProvider.autoDispose<List<AccountDto>>((ref) async {
  final repo = ref.watch(accountingRepositoryProvider);
  return repo.getAccounts();
});

final journalEntriesProvider = FutureProvider.autoDispose<List<JournalEntryDto>>((ref) async {
  final repo = ref.watch(accountingRepositoryProvider);
  return repo.getJournalEntries();
});

final trialBalanceProvider = FutureProvider.autoDispose.family<TrialBalanceResponseDto, String?>((ref, asOfDate) async {
  final repo = ref.watch(accountingRepositoryProvider);
  return repo.getTrialBalance(asOfDate: asOfDate);
});

final balanceSheetProvider = FutureProvider.autoDispose.family<BalanceSheetResponseDto, String?>((ref, asOfDate) async {
  final repo = ref.watch(accountingRepositoryProvider);
  return repo.getBalanceSheet(asOfDate: asOfDate);
});

class IncomeStatementParams {
  final String? startDate;
  final String? endDate;
  IncomeStatementParams({this.startDate, this.endDate});
  
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is IncomeStatementParams &&
          runtimeType == other.runtimeType &&
          startDate == other.startDate &&
          endDate == other.endDate;

  @override
  int get hashCode => startDate.hashCode ^ endDate.hashCode;
}

final incomeStatementProvider = FutureProvider.autoDispose.family<IncomeStatementResponseDto, IncomeStatementParams>((ref, params) async {
  final repo = ref.watch(accountingRepositoryProvider);
  return repo.getIncomeStatement(startDate: params.startDate, endDate: params.endDate);
});

final internalReconciliationProvider = FutureProvider.autoDispose<InternalReconciliationResponseDto>((ref) async {
  final repo = ref.watch(accountingRepositoryProvider);
  return repo.getInternalReconciliation();
});

final financialYearsProvider = FutureProvider.autoDispose<List<FinancialYearResponseDto>>((ref) async {
  final repo = ref.watch(accountingRepositoryProvider);
  return repo.getFinancialYears();
});

final saccoExpensesProvider = FutureProvider.autoDispose<List<SaccoExpenseResponseDto>>((ref) async {
  final repo = ref.watch(accountingRepositoryProvider);
  return repo.getSaccoExpenses();
});
