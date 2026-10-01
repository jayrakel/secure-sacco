class JournalEntryLineDto {
  final String? id;
  final String accountCode;
  final String? accountName;
  final String? memberId;
  final double debitAmount;
  final double creditAmount;
  final String? description;

  JournalEntryLineDto({
    this.id,
    required this.accountCode,
    this.accountName,
    this.memberId,
    required this.debitAmount,
    required this.creditAmount,
    this.description,
  });

  factory JournalEntryLineDto.fromJson(Map<String, dynamic> json) {
    return JournalEntryLineDto(
      id: json['id'] as String?,
      accountCode: json['accountCode'] as String,
      accountName: json['accountName'] as String?,
      memberId: json['memberId'] as String?,
      debitAmount: (json['debitAmount'] as num).toDouble(),
      creditAmount: (json['creditAmount'] as num).toDouble(),
      description: json['description'] as String?,
    );
  }
}

class JournalEntryDto {
  final String id;
  final String transactionDate;
  final String referenceNumber;
  final String description;
  final String status; // DRAFT, POSTED, REVERSED
  final List<JournalEntryLineDto> lines;

  JournalEntryDto({
    required this.id,
    required this.transactionDate,
    required this.referenceNumber,
    required this.description,
    required this.status,
    required this.lines,
  });

  factory JournalEntryDto.fromJson(Map<String, dynamic> json) {
    var linesList = json['lines'] as List? ?? [];
    List<JournalEntryLineDto> parsedLines = linesList.map((i) => JournalEntryLineDto.fromJson(i)).toList();

    return JournalEntryDto(
      id: json['id'] as String,
      transactionDate: json['transactionDate'] as String,
      referenceNumber: json['referenceNumber'] as String,
      description: json['description'] as String,
      status: json['status'] as String,
      lines: parsedLines,
    );
  }
}

class JournalEntryLineRequestDto {
  final String accountCode;
  final String? memberId;
  final double debitAmount;
  final double creditAmount;
  final String? description;

  JournalEntryLineRequestDto({
    required this.accountCode,
    this.memberId,
    required this.debitAmount,
    required this.creditAmount,
    this.description,
  });

  Map<String, dynamic> toJson() {
    return {
      'accountCode': accountCode,
      if (memberId != null) 'memberId': memberId,
      'debitAmount': debitAmount,
      'creditAmount': creditAmount,
      if (description != null) 'description': description,
    };
  }
}

class CreateJournalEntryRequestDto {
  final String transactionDate;
  final String referenceNumber;
  final String description;
  final List<JournalEntryLineRequestDto> lines;

  CreateJournalEntryRequestDto({
    required this.transactionDate,
    required this.referenceNumber,
    required this.description,
    required this.lines,
  });

  Map<String, dynamic> toJson() {
    return {
      'transactionDate': transactionDate,
      'referenceNumber': referenceNumber,
      'description': description,
      'lines': lines.map((line) => line.toJson()).toList(),
    };
  }
}
