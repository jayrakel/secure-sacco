class SmsLogDto {
  final String id;
  final String phoneNumber;
  final String message;
  final String status;
  final String? providerResponse;
  final String? cost;
  final String createdAt;
  final String updatedAt;

  SmsLogDto({
    required this.id,
    required this.phoneNumber,
    required this.message,
    required this.status,
    this.providerResponse,
    this.cost,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SmsLogDto.fromJson(Map<String, dynamic> json) {
    return SmsLogDto(
      id: json['id'] as String,
      phoneNumber: json['phoneNumber'] as String,
      message: json['message'] as String,
      status: json['status'] as String,
      providerResponse: json['providerResponse'] as String?,
      cost: json['cost'] as String?,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }
}

class SmsLogResponseDto {
  final List<SmsLogDto> content;
  final int totalElements;
  final int totalPages;
  final int number;
  final int size;
  final bool first;
  final bool last;

  SmsLogResponseDto({
    required this.content,
    required this.totalElements,
    required this.totalPages,
    required this.number,
    required this.size,
    required this.first,
    required this.last,
  });

  factory SmsLogResponseDto.fromJson(Map<String, dynamic> json) {
    return SmsLogResponseDto(
      content: (json['content'] as List<dynamic>?)
              ?.map((e) => SmsLogDto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalElements: json['totalElements'] as int? ?? 0,
      totalPages: json['totalPages'] as int? ?? 0,
      number: json['number'] as int? ?? 0,
      size: json['size'] as int? ?? 20,
      first: json['first'] as bool? ?? true,
      last: json['last'] as bool? ?? true,
    );
  }
}
