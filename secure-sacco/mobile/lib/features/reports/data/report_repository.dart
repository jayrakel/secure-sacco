import 'package:dio/dio.dart';
import 'report_dto.dart';

class ReportRepository {
  final Dio _dio;

  ReportRepository(this._dio);

  Future<List<LoanArrearsDto>> getLoanArrears() async {
    final res = await _dio.get('/api/v1/reports/loans/arrears');
    final data = res.data as List;
    return data.map((e) => LoanArrearsDto.fromJson(e)).toList();
  }

  Future<DailyCollectionDto> getDailyCollections([String? date]) async {
    final params = date != null ? {'date': date} : null;
    final res = await _dio.get('/api/v1/reports/collections/daily', queryParameters: params);
    return DailyCollectionDto.fromJson(res.data);
  }

  Future<List<PaymentLineDto>> getDailyCollectionLines([String? date]) async {
    final params = date != null ? {'date': date} : null;
    final res = await _dio.get('/api/v1/reports/collections/daily/lines', queryParameters: params);
    final data = res.data as List;
    return data.map((e) => PaymentLineDto.fromJson(e)).toList();
  }

  Future<StatementResponseDto> getMemberStatement(String memberId, {String? from, String? to}) async {
    final params = <String, dynamic>{};
    if (from != null) params['from'] = from;
    if (to != null) params['to'] = to;
    
    final res = await _dio.get('/api/v1/reports/members/$memberId/statement', queryParameters: params);
    return StatementResponseDto.fromJson(res.data);
  }

  Future<MemberMiniSummaryDto> getMySummary() async {
    final res = await _dio.get('/api/v1/reports/me/summary');
    return MemberMiniSummaryDto.fromJson(res.data);
  }

  Future<IncomeReportDto> getIncomeReport(String from, String to) async {
    final res = await _dio.get('/api/v1/reports/income', queryParameters: {'from': from, 'to': to});
    return IncomeReportDto.fromJson(res.data);
  }

  Future<GeneralStatementDto> getGeneralStatement({String? from, String? to, String? accountCode}) async {
    final params = <String, dynamic>{};
    if (from != null) params['from'] = from;
    if (to != null) params['to'] = to;
    if (accountCode != null) params['accountCode'] = accountCode;

    final res = await _dio.get('/api/v1/reports/general-statement', queryParameters: params);
    return GeneralStatementDto.fromJson(res.data);
  }

  Future<PaymentRouteLookupResponse?> lookupPayment(String reference) async {
    try {
      final res = await _dio.get('/api/v1/reports/payment-lookup', queryParameters: {'reference': reference});
      return PaymentRouteLookupResponse.fromJson(res.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }
}
