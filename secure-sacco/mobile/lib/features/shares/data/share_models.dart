class ShareAccount {
  final String id;
  final double balance;
  final String status;
  final String productName;
  final String productCode;
  final DateTime createdAt;

  ShareAccount({
    required this.id,
    required this.balance,
    required this.status,
    required this.productName,
    required this.productCode,
    required this.createdAt,
  });

  factory ShareAccount.fromJson(Map<String, dynamic> json) {
    return ShareAccount(
      id: json['id'],
      balance: (json['balance'] as num).toDouble(),
      status: json['status'],
      productName: json['product']['name'],
      productCode: json['product']['code'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class ShareTransaction {
  final String id;
  final double amount;
  final String type;
  final String reference;
  final DateTime createdAt;

  ShareTransaction({
    required this.id,
    required this.amount,
    required this.type,
    required this.reference,
    required this.createdAt,
  });

  factory ShareTransaction.fromJson(Map<String, dynamic> json) {
    return ShareTransaction(
      id: json['id'],
      amount: (json['amount'] as num).toDouble(),
      type: json['type'],
      reference: json['reference'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
