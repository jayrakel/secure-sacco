import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import 'share_models.dart';

part 'share_api.g.dart';

@RestApi()
abstract class ShareApi {
  factory ShareApi(Dio dio, {String baseUrl}) = _ShareApi;

  @GET('/me/shares')
  Future<List<ShareAccount>> getMyShares();

  @GET('/me/shares/{accountId}/transactions')
  Future<List<ShareTransaction>> getTransactions(@Path('accountId') String accountId);
}
