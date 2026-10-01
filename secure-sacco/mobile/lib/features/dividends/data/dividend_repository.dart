import 'package:dio/dio.dart';
import '../../../core/networking/api_client.dart';
import 'dividend_dto.dart';

class DividendRepository {
  final Dio _dio;

  DividendRepository(this._dio);

  Future<List<DividendDeclaration>> getDeclarations() async {
    try {
      final response = await _dio.get('/api/v1/admin/dividends');
      return (response.data as List)
          .map((json) => DividendDeclaration.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Failed to load dividend declarations: $e');
    }
  }

  Future<PreviewDividendResponse> previewDividends(DeclareDividendRequest request) async {
    try {
      final response = await _dio.post(
        '/api/v1/admin/dividends/preview',
        data: request.toJson(),
      );
      return PreviewDividendResponse.fromJson(response.data);
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ?? 'Failed to preview dividends';
      throw Exception(message);
    } catch (e) {
      throw Exception('Failed to preview dividends: $e');
    }
  }

  Future<DividendDeclaration> declareDividend(DeclareDividendRequest request) async {
    try {
      final response = await _dio.post(
        '/api/v1/admin/dividends/declare',
        data: request.toJson(),
      );
      return DividendDeclaration.fromJson(response.data);
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ?? 'Failed to declare dividends';
      throw Exception(message);
    } catch (e) {
      throw Exception('Failed to declare dividends: $e');
    }
  }
}
