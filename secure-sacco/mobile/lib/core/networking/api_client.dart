import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'cookie_manager_provider.dart';
import 'interceptors/csrf_interceptor.dart';
import 'interceptors/auth_interceptor.dart';
import 'package:flutter/foundation.dart';

// Base URL is injected at build time via --dart-define=BASE_URL=...
// Release builds default to the production server; debug defaults to ADB-tunneled localhost.
const String kBaseUrl = String.fromEnvironment(
  'BASE_URL',
  defaultValue: kReleaseMode
      ? 'https://api.betterlinkventureslimited.co.ke'
      : 'http://127.0.0.1:8080',
);

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: kBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  ));

  final cookieManager = ref.watch(cookieManagerProvider);
  final cookieJar = ref.watch(cookieJarProvider);

  dio.interceptors.addAll([
    cookieManager,
    CsrfInterceptor(cookieJar: cookieJar, baseUrl: kBaseUrl),
    AuthInterceptor(ref),
    if (kDebugMode)
      LogInterceptor(
        request: true,
        requestHeader: false,
        requestBody: true,
        responseHeader: false,
        responseBody: true,
      ),
  ]);

  return dio;
});
