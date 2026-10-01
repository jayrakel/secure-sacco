import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'account_dto.dart';
import 'journal_entry_dto.dart';
import 'accounting_report_dtos.dart';
import 'reconciliation_dto.dart';
import 'financial_year_dto.dart';
import 'sacco_expense_dto.dart';

class AccountingRepository {
  final Dio _dio;

  AccountingRepository(this._dio);

  // Accounts
  Future<List<AccountDto>> getAccounts() async {
    final response = await _dio.get('/api/v1/accounting/accounts');
    final List<dynamic> data = response.data;
    return data.map((json) => AccountDto.fromJson(json)).toList();
  }

  Future<AccountDto> createAccount(CreateAccountRequestDto request) async {
    final response = await _dio.post(
      '/api/v1/accounting/accounts',
      data: request.toJson(),
    );
    return AccountDto.fromJson(response.data);
  }

  // Journal Entries
  Future<List<JournalEntryDto>> getJournalEntries() async {
    final response = await _dio.get('/api/v1/accounting/journals');
    // Assuming backend returns a PagedResponse, we extract 'content' array
    final List<dynamic> data = response.data['content'] ?? [];
    return data.map((json) => JournalEntryDto.fromJson(json)).toList();
  }

  Future<JournalEntryDto> createJournalEntry(CreateJournalEntryRequestDto request) async {
    final response = await _dio.post(
      '/api/v1/accounting/journals',
      data: request.toJson(),
    );
    return JournalEntryDto.fromJson(response.data);
  }

  // Reports
  Future<BalanceSheetResponseDto> getBalanceSheet({String? asOfDate}) async {
    final response = await _dio.get(
      '/api/v1/accounting/balance-sheet',
      queryParameters: asOfDate != null ? {'asOfDate': asOfDate} : null,
      options: Options(receiveTimeout: const Duration(seconds: 45)),
    );
    return BalanceSheetResponseDto.fromJson(response.data);
  }

  Future<IncomeStatementResponseDto> getIncomeStatement({String? startDate, String? endDate}) async {
    final Map<String, dynamic> query = {};
    if (startDate != null) query['startDate'] = startDate;
    if (endDate != null) query['endDate'] = endDate;
    
    final response = await _dio.get(
      '/api/v1/accounting/income-statement',
      queryParameters: query.isNotEmpty ? query : null,
    );
    return IncomeStatementResponseDto.fromJson(response.data);
  }

  Future<TrialBalanceResponseDto> getTrialBalance({String? asOfDate}) async {
    final response = await _dio.get(
      '/api/v1/accounting/trial-balance',
      queryParameters: asOfDate != null ? {'asOfDate': asOfDate} : null,
    );
    return TrialBalanceResponseDto.fromJson(response.data);
  }

  // Reconciliation
  Future<InternalReconciliationResponseDto> getInternalReconciliation() async {
    final response = await _dio.get('/api/v1/accounting/reconciliation/internal');
    return InternalReconciliationResponseDto.fromJson(response.data);
  }

  // Financial Year
  Future<List<FinancialYearResponseDto>> getFinancialYears() async {
    final response = await _dio.get('/api/v1/accounting/financial-years');
    final List<dynamic> data = response.data;
    return data.map((json) => FinancialYearResponseDto.fromJson(json)).toList();
  }

  Future<FinancialYearResponseDto> createFinancialYear(CreateFinancialYearRequestDto request) async {
    final response = await _dio.post(
      '/api/v1/accounting/financial-years',
      data: request.toJson(),
    );
    return FinancialYearResponseDto.fromJson(response.data);
  }

  // Sacco Expenses
  Future<List<SaccoExpenseResponseDto>> getSaccoExpenses() async {
    final response = await _dio.get('/api/v1/accounting/sacco-expenses');
    final List<dynamic> data = response.data;
    return data.map((json) => SaccoExpenseResponseDto.fromJson(json)).toList();
  }

  Future<SaccoExpenseResponseDto> recordSaccoExpense(RecordSaccoExpenseRequestDto request) async {
    final response = await _dio.post(
      '/api/v1/accounting/sacco-expenses',
      data: request.toJson(),
    );
    return SaccoExpenseResponseDto.fromJson(response.data);
  }
}

final accountingRepositoryProvider = Provider<AccountingRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return AccountingRepository(dio);
});
