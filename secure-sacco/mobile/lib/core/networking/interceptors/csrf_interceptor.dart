import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';

class CsrfInterceptor extends Interceptor {
  final CookieJar cookieJar;
  final String baseUrl;

  CsrfInterceptor({required this.cookieJar, required this.baseUrl});

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Only apply CSRF token for mutating requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].contains(options.method.toUpperCase())) {
      final cookies = await cookieJar.loadForRequest(Uri.parse(baseUrl));
      final csrfCookie = cookies.where((c) => c.name == 'XSRF-TOKEN').firstOrNull;
      
      if (csrfCookie != null) {
        options.headers['X-XSRF-TOKEN'] = csrfCookie.value;
      }
    }
    
    super.onRequest(options, handler);
  }
}
