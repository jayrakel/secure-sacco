class InitiateStkRequest {
  final String phoneNumber;
  final double amount;
  final String accountReference;

  InitiateStkRequest({
    required this.phoneNumber,
    required this.amount,
    required this.accountReference,
  });

  Map<String, dynamic> toJson() {
    return {
      'phoneNumber': phoneNumber,
      'amount': amount,
      'accountReference': accountReference,
    };
  }
}

class InitiateStkResponse {
  final String message;
  final String checkoutRequestID;
  final String customerMessage;

  InitiateStkResponse({
    required this.message,
    required this.checkoutRequestID,
    required this.customerMessage,
  });

  factory InitiateStkResponse.fromJson(Map<String, dynamic> json) {
    return InitiateStkResponse(
      message: json['message'] ?? '',
      checkoutRequestID: json['checkoutRequestID'] ?? '',
      customerMessage: json['customerMessage'] ?? '',
    );
  }
}

class CoopBalanceResponse {
  final String messageReference;
  final String messageCode;
  final String messageDescription;
  final String accountName;
  final String accountNumber;
  final String currency;
  final double availableBalance;
  final double bookedBalance;
  final double clearedBalance;

  CoopBalanceResponse({
    required this.messageReference,
    required this.messageCode,
    required this.messageDescription,
    required this.accountName,
    required this.accountNumber,
    required this.currency,
    required this.availableBalance,
    required this.bookedBalance,
    required this.clearedBalance,
  });

  factory CoopBalanceResponse.fromJson(Map<String, dynamic> json) {
    return CoopBalanceResponse(
      messageReference: json['MessageReference'] ?? '',
      messageCode: json['MessageCode'] ?? '',
      messageDescription: json['MessageDescription'] ?? '',
      accountName: json['AccountName'] ?? '',
      accountNumber: json['AccountNumber'] ?? '',
      currency: json['Currency'] ?? '',
      availableBalance: double.tryParse(json['AvailableBalance']?.toString() ?? '') ?? 0.0,
      bookedBalance: double.tryParse(json['BookedBalance']?.toString() ?? '') ?? 0.0,
      clearedBalance: double.tryParse(json['ClearedBalance']?.toString() ?? '') ?? 0.0,
    );
  }
}

class CoopTransaction {
  final String id;
  final String? mpesaRef;
  final String source;
  final String transactionType;
  final double amount;
  final double? runningBalance;
  final String? transactionDate;
  final String? senderPhone;
  final String? memberId;
  final bool isMember;
  final String? displayName;
  final bool savingsCredited;

  CoopTransaction({
    required this.id,
    this.mpesaRef,
    required this.source,
    required this.transactionType,
    required this.amount,
    this.runningBalance,
    this.transactionDate,
    this.senderPhone,
    this.memberId,
    required this.isMember,
    this.displayName,
    required this.savingsCredited,
  });

  factory CoopTransaction.fromJson(Map<String, dynamic> json) {
    return CoopTransaction(
      id: json['id'] ?? '',
      mpesaRef: json['mpesaRef'],
      source: json['source'] ?? '',
      transactionType: json['transactionType'] ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '') ?? 0.0,
      runningBalance: double.tryParse(json['runningBalance']?.toString() ?? ''),
      transactionDate: json['transactionDate'],
      senderPhone: json['senderPhone'],
      memberId: json['memberId'],
      isMember: json['isMember'] ?? false,
      displayName: json['displayName'],
      savingsCredited: json['savingsCredited'] ?? false,
    );
  }
}

class CoopFeedResponse {
  final List<CoopTransaction> transactions;
  final int totalElements;
  final int totalPages;
  final int currentPage;

  CoopFeedResponse({
    required this.transactions,
    required this.totalElements,
    required this.totalPages,
    required this.currentPage,
  });

  factory CoopFeedResponse.fromJson(Map<String, dynamic> json) {
    return CoopFeedResponse(
      transactions: (json['transactions'] as List<dynamic>?)
              ?.map((e) => CoopTransaction.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalElements: json['totalElements'] ?? 0,
      totalPages: json['totalPages'] ?? 0,
      currentPage: json['currentPage'] ?? 0,
    );
  }
}
