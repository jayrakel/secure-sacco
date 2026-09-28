import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureCookieStorage implements Storage {
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  
  SecureCookieStorage();

  @override
  Future<void> init(bool persistSession, bool ignoreExpires) async {
    // Initialization if necessary
  }

  @override
  Future<String?> read(String key) async {
    return await _secureStorage.read(key: _cleanKey(key));
  }

  @override
  Future<void> write(String key, String value) async {
    await _secureStorage.write(key: _cleanKey(key), value: value);
  }

  @override
  Future<void> delete(String key) async {
    await _secureStorage.delete(key: _cleanKey(key));
  }

  @override
  Future<void> deleteAll(List<String> keys) async {
    for (var key in keys) {
      await _secureStorage.delete(key: _cleanKey(key));
    }
  }

  // flutter_secure_storage keys must not contain certain characters
  String _cleanKey(String key) {
    return 'cookie_${key.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_')}';
  }
}
