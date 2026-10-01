import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'payment_repository.dart';

final paymentRepositoryProvider = Provider<PaymentRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return PaymentRepository(dio);
});
