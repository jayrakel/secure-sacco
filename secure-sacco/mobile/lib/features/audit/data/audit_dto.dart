class AuditLogDto {
  final String id;
  final String createdAt;
  final String actor;
  final String? userId;
  final String? memberId;
  final String? sessionId;
  final String action;
  final String? permissionUsed;
  final String result;
  final String? entityType;
  final String? entityId;
  final String? target;
  final String? ipAddress;
  final String? userAgent;
  final String? details;
  final String? beforeState;
  final String? afterState;

  AuditLogDto({
    required this.id,
    required this.createdAt,
    required this.actor,
    this.userId,
    this.memberId,
    this.sessionId,
    required this.action,
    this.permissionUsed,
    required this.result,
    this.entityType,
    this.entityId,
    this.target,
    this.ipAddress,
    this.userAgent,
    this.details,
    this.beforeState,
    this.afterState,
  });

  factory AuditLogDto.fromJson(Map<String, dynamic> json) {
    return AuditLogDto(
      id: json['id'] as String,
      createdAt: json['createdAt'] as String,
      actor: json['actor'] as String,
      userId: json['userId'] as String?,
      memberId: json['memberId'] as String?,
      sessionId: json['sessionId'] as String?,
      action: json['action'] as String,
      permissionUsed: json['permissionUsed'] as String?,
      result: json['result'] as String,
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
      target: json['target'] as String?,
      ipAddress: json['ipAddress'] as String?,
      userAgent: json['userAgent'] as String?,
      details: json['details'] as String?,
      beforeState: json['beforeState'] as String?,
      afterState: json['afterState'] as String?,
    );
  }
}

class AuditLogResponseDto {
  final List<AuditLogDto> content;
  final int totalElements;
  final int totalPages;
  final int page;
  final int size;

  AuditLogResponseDto({
    required this.content,
    required this.totalElements,
    required this.totalPages,
    required this.page,
    required this.size,
  });

  factory AuditLogResponseDto.fromJson(Map<String, dynamic> json) {
    return AuditLogResponseDto(
      content: (json['content'] as List<dynamic>?)
              ?.map((e) => AuditLogDto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalElements: json['totalElements'] as int? ?? 0,
      totalPages: json['totalPages'] as int? ?? 0,
      page: json['page'] as int? ?? 0,
      size: json['size'] as int? ?? 50,
    );
  }
}
