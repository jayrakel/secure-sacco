import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../networking/cookie_manager_provider.dart';
import '../../../features/auth/data/auth_state.dart';

class AuthInterceptor extends Interceptor {
  final Ref ref;

  AuthInterceptor(this.ref);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final path = err.requestOptions.path;
      // Do not trigger logout if it's the login endpoint returning 401
      if (!path.contains('/api/v1/auth/login')) {
        // Clear the cookie jar
        final cookieJar = ref.read(cookieJarProvider);
        await cookieJar.deleteAll();

        // Update auth state to unauthenticated
        ref.read(authControllerProvider.notifier).logoutLocal();
      }
    }
    super.onError(err, handler);
  }
}
