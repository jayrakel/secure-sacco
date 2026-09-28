import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'secure_cookie_storage.dart';

final cookieJarProvider = Provider<CookieJar>((ref) {
  return PersistCookieJar(
    storage: SecureCookieStorage(),
  );
});

final cookieManagerProvider = Provider<CookieManager>((ref) {
  final cookieJar = ref.watch(cookieJarProvider);
  return CookieManager(cookieJar);
});
