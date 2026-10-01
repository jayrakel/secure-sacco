import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import 'public_models.dart';

part 'public_api.g.dart';

@RestApi()
abstract class PublicApi {
  factory PublicApi(Dio dio, {String baseUrl}) = _PublicApi;

  @GET('/api/v1/public/landing')
  Future<LandingPageData> getLandingData();

  @GET('/api/v1/public/receipts/{ref}')
  Future<PaymentRouteLookupResponse> getReceipt(@Path('ref') String ref);
}
