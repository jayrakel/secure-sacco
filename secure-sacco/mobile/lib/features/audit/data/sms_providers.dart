import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sms_repository.dart';
import 'sms_dto.dart';

class SmsLogParams {
  final int page;
  final int size;
  final String? status;
  final String? search;

  SmsLogParams({
    this.page = 0,
    this.size = 20,
    this.status,
    this.search,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
  
    return other is SmsLogParams &&
      other.page == page &&
      other.size == size &&
      other.status == status &&
      other.search == search;
  }

  @override
  int get hashCode {
    return page.hashCode ^
      size.hashCode ^
      status.hashCode ^
      search.hashCode;
  }
}

final smsLogsProvider = FutureProvider.family<SmsLogResponseDto, SmsLogParams>((ref, params) async {
  final repository = ref.watch(smsRepositoryProvider);
  return await repository.getLogs(
    page: params.page,
    size: params.size,
    status: params.status,
    search: params.search,
  );
});
