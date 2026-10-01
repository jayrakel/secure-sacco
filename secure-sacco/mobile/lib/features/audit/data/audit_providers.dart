import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'audit_repository.dart';
import 'audit_dto.dart';

class AuditLogParams {
  final int page;
  final int size;
  final String? actorEmail;
  final String? eventType;
  final String? from;
  final String? to;

  AuditLogParams({
    this.page = 0,
    this.size = 50,
    this.actorEmail,
    this.eventType,
    this.from,
    this.to,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AuditLogParams &&
        other.page == page &&
        other.size == size &&
        other.actorEmail == actorEmail &&
        other.eventType == eventType &&
        other.from == from &&
        other.to == to;
  }

  @override
  int get hashCode {
    return page.hashCode ^
        size.hashCode ^
        actorEmail.hashCode ^
        eventType.hashCode ^
        from.hashCode ^
        to.hashCode;
  }
}

final auditLogsProvider = FutureProvider.autoDispose.family<AuditLogResponseDto, AuditLogParams>((ref, params) async {
  final repo = ref.watch(auditRepositoryProvider);
  return repo.getLogs(
    page: params.page,
    size: params.size,
    actorEmail: params.actorEmail,
    eventType: params.eventType,
    from: params.from,
    to: params.to,
  );
});
