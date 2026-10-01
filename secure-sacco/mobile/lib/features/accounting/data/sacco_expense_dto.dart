class SaccoExpenseResponseDto {
  final String id;
  final String expenseDate;
  final double amount;
  final String glAccountCode;
  final String narration;
  final String? reference;
  final String? journalReference;
  final String createdByUserId;
  final String? createdAt;
  final String? updatedAt;

  SaccoExpenseResponseDto({
    required this.id,
    required this.expenseDate,
    required this.amount,
    required this.glAccountCode,
    required this.narration,
    this.reference,
    this.journalReference,
    required this.createdByUserId,
    this.createdAt,
    this.updatedAt,
  });

  factory SaccoExpenseResponseDto.fromJson(Map<String, dynamic> json) {
    return SaccoExpenseResponseDto(
      id: json['id'] as String,
      expenseDate: json['expenseDate'] as String,
      amount: (json['amount'] as num).toDouble(),
      glAccountCode: json['glAccountCode'] as String,
      narration: json['narration'] as String,
      reference: json['reference'] as String?,
      journalReference: json['journalReference'] as String?,
      createdByUserId: json['createdByUserId'] as String,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }
}

class RecordSaccoExpenseRequestDto {
  final String expenseDate;
  final double amount;
  final String glAccountCode;
  final String narration;
  final String? reference;

  RecordSaccoExpenseRequestDto({
    required this.expenseDate,
    required this.amount,
    required this.glAccountCode,
    required this.narration,
    this.reference,
  });

  Map<String, dynamic> toJson() {
    return {
      'expenseDate': expenseDate,
      'amount': amount,
      'glAccountCode': glAccountCode,
      'narration': narration,
      if (reference != null && reference!.isNotEmpty) 'reference': reference,
    };
  }
}
