class StatementTransactionResponse {
  final String transactionId;
  final String type; // 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE_REIMBURSEMENT'
  final String channel; // 'CASH' | 'MPESA' | 'INTERNAL'
  final double amount;
  final String reference;
  final String status; // 'PENDING' | 'POSTED' | 'FAILED' | 'REVERSED'
  final DateTime? postedAt;
  final double runningBalance;

  StatementTransactionResponse({
    required this.transactionId,
    required this.type,
    required this.channel,
    required this.amount,
    required this.reference,
    required this.status,
    this.postedAt,
    required this.runningBalance,
  });

  factory StatementTransactionResponse.fromJson(Map<String, dynamic> json) {
    return StatementTransactionResponse(
      transactionId: json['transactionId'] as String,
      type: json['type'] as String,
      channel: json['channel'] as String,
      amount: (json['amount'] as num).toDouble(),
      reference: json['reference'] as String,
      status: json['status'] as String,
      postedAt: json['postedAt'] != null ? DateTime.parse(json['postedAt'] as String) : null,
      runningBalance: (json['runningBalance'] as num).toDouble(),
    );
  }
}

class SavingsBalanceResponse {
  final double availableBalance;
  final String accountStatus;

  SavingsBalanceResponse({
    required this.availableBalance,
    required this.accountStatus,
  });

  factory SavingsBalanceResponse.fromJson(Map<String, dynamic> json) {
    return SavingsBalanceResponse(
      availableBalance: (json['availableBalance'] as num).toDouble(),
      accountStatus: json['accountStatus'] as String,
    );
  }
}

class ManualTransactionRequest {
  final String memberId;
  final double amount;
  final String? channel; // Usually 'CASH' or 'BANK_TRANSFER' for deposits
  final String? bankName;
  final String? externalReference;
  final String? referenceNotes;

  ManualTransactionRequest({
    required this.memberId,
    required this.amount,
    this.channel,
    this.bankName,
    this.externalReference,
    this.referenceNotes,
  });

  Map<String, dynamic> toJson() {
    return {
      'memberId': memberId,
      'amount': amount,
      if (channel != null) 'channel': channel,
      if (bankName != null) 'bankName': bankName,
      if (externalReference != null) 'externalReference': externalReference,
      if (referenceNotes != null) 'referenceNotes': referenceNotes,
    };
  }
}
