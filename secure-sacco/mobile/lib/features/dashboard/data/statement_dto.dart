class StatementItemDto {
  final String? date;
  final String? module;
  final String? type;
  final double amount;
  final String? reference;
  final String? description;

  StatementItemDto({
    this.date,
    this.module,
    this.type,
    this.amount = 0.0,
    this.reference,
    this.description,
  });

  factory StatementItemDto.fromJson(Map<String, dynamic> json) {
    return StatementItemDto(
      date: json['date'],
      module: json['module'],
      type: json['type'],
      amount: (json['amount'] ?? 0).toDouble(),
      reference: json['reference'],
      description: json['description'],
    );
  }
}

class StatementResponseDto {
  final List<StatementItemDto> items;

  StatementResponseDto({
    required this.items,
  });

  factory StatementResponseDto.fromJson(Map<String, dynamic> json) {
    return StatementResponseDto(
      items: (json['items'] as List<dynamic>?)
              ?.map((item) => StatementItemDto.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
