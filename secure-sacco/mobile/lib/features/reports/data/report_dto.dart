class LoanArrearsDto {
  final String memberNumber;
  final String memberName;
  final String loanId;
  final String productName;
  final double amountOverdue;
  final int daysOverdue;
  final String bucket;

  LoanArrearsDto({
    required this.memberNumber,
    required this.memberName,
    required this.loanId,
    required this.productName,
    required this.amountOverdue,
    required this.daysOverdue,
    required this.bucket,
  });

  factory LoanArrearsDto.fromJson(Map<String, dynamic> json) {
    return LoanArrearsDto(
      memberNumber: json['memberNumber'] ?? '',
      memberName: json['memberName'] ?? '',
      loanId: json['loanId'] ?? '',
      productName: json['productName'] ?? '',
      amountOverdue: (json['amountOverdue'] ?? 0).toDouble(),
      daysOverdue: json['daysOverdue'] ?? 0,
      bucket: json['bucket'] ?? '',
    );
  }
}

class StatementItemDto {
  final String date;
  final String module;
  final String type;
  final double amount;
  final String reference;
  final String description;

  StatementItemDto({
    required this.date,
    required this.module,
    required this.type,
    required this.amount,
    required this.reference,
    required this.description,
  });

  factory StatementItemDto.fromJson(Map<String, dynamic> json) {
    return StatementItemDto(
      date: json['date'] ?? '',
      module: json['module'] ?? '',
      type: json['type'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      reference: json['reference'] ?? '',
      description: json['description'] ?? '',
    );
  }
}

class StatementSummaryDto {
  final double loanDisbursed;
  final double loanRepaid;
  final double loanOutstanding;
  final double savingsDeposited;
  final double savingsWithdrawn;
  final double penaltiesCharged;
  final double penaltiesPaid;
  final double penaltiesOutstanding;

  StatementSummaryDto({
    required this.loanDisbursed,
    required this.loanRepaid,
    required this.loanOutstanding,
    required this.savingsDeposited,
    required this.savingsWithdrawn,
    required this.penaltiesCharged,
    required this.penaltiesPaid,
    required this.penaltiesOutstanding,
  });

  factory StatementSummaryDto.fromJson(Map<String, dynamic> json) {
    return StatementSummaryDto(
      loanDisbursed: (json['loanDisbursed'] ?? 0).toDouble(),
      loanRepaid: (json['loanRepaid'] ?? 0).toDouble(),
      loanOutstanding: (json['loanOutstanding'] ?? 0).toDouble(),
      savingsDeposited: (json['savingsDeposited'] ?? 0).toDouble(),
      savingsWithdrawn: (json['savingsWithdrawn'] ?? 0).toDouble(),
      penaltiesCharged: (json['penaltiesCharged'] ?? 0).toDouble(),
      penaltiesPaid: (json['penaltiesPaid'] ?? 0).toDouble(),
      penaltiesOutstanding: (json['penaltiesOutstanding'] ?? 0).toDouble(),
    );
  }
}

class StatementResponseDto {
  final List<StatementItemDto> items;
  final StatementSummaryDto summary;

  StatementResponseDto({
    required this.items,
    required this.summary,
  });

  factory StatementResponseDto.fromJson(Map<String, dynamic> json) {
    final itemsList = (json['items'] as List?) ?? [];
    return StatementResponseDto(
      items: itemsList.map((e) => StatementItemDto.fromJson(e)).toList(),
      summary: StatementSummaryDto.fromJson(json['summary'] ?? {}),
    );
  }
}

class MemberMiniSummaryDto {
  final double savingsBalance;
  final double loanArrears;
  final double penaltyOutstanding;
  final String activeLoanStatus;
  final String? nextDueDate;

  MemberMiniSummaryDto({
    required this.savingsBalance,
    required this.loanArrears,
    required this.penaltyOutstanding,
    required this.activeLoanStatus,
    this.nextDueDate,
  });

  factory MemberMiniSummaryDto.fromJson(Map<String, dynamic> json) {
    return MemberMiniSummaryDto(
      savingsBalance: (json['savingsBalance'] ?? 0).toDouble(),
      loanArrears: (json['loanArrears'] ?? 0).toDouble(),
      penaltyOutstanding: (json['penaltyOutstanding'] ?? 0).toDouble(),
      activeLoanStatus: json['activeLoanStatus'] ?? '',
      nextDueDate: json['nextDueDate'],
    );
  }
}

class DailyCollectionDto {
  final String date;
  final double totalCollected;
  final Map<String, double> byChannel;
  final Map<String, double> byType;

  DailyCollectionDto({
    required this.date,
    required this.totalCollected,
    required this.byChannel,
    required this.byType,
  });

  factory DailyCollectionDto.fromJson(Map<String, dynamic> json) {
    final Map<String, double> channelMap = {};
    if (json['byChannel'] != null) {
      final map = json['byChannel'] as Map<String, dynamic>;
      map.forEach((k, v) => channelMap[k] = (v as num).toDouble());
    }

    final Map<String, double> typeMap = {};
    if (json['byType'] != null) {
      final map = json['byType'] as Map<String, dynamic>;
      map.forEach((k, v) => typeMap[k] = (v as num).toDouble());
    }

    return DailyCollectionDto(
      date: json['date'] ?? '',
      totalCollected: (json['totalCollected'] ?? 0).toDouble(),
      byChannel: channelMap,
      byType: typeMap,
    );
  }
}

class PaymentLineDto {
  final String id;
  final String? transactionRef;
  final String? mpesaRef;
  final String internalRef;
  final double amount;
  final String paymentMethod;
  final String paymentType;
  final String? accountReference;
  final String? senderName;
  final String? senderPhoneNumber;
  final String status;
  final String createdAt;

  PaymentLineDto({
    required this.id,
    this.transactionRef,
    this.mpesaRef,
    required this.internalRef,
    required this.amount,
    required this.paymentMethod,
    required this.paymentType,
    this.accountReference,
    this.senderName,
    this.senderPhoneNumber,
    required this.status,
    required this.createdAt,
  });

  factory PaymentLineDto.fromJson(Map<String, dynamic> json) {
    return PaymentLineDto(
      id: json['id'] ?? '',
      transactionRef: json['transactionRef'],
      mpesaRef: json['mpesaRef'],
      internalRef: json['internalRef'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      paymentMethod: json['paymentMethod'] ?? '',
      paymentType: json['paymentType'] ?? '',
      accountReference: json['accountReference'],
      senderName: json['senderName'],
      senderPhoneNumber: json['senderPhoneNumber'],
      status: json['status'] ?? '',
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class IncomeCategoryDto {
  final String category;
  final double amount;

  IncomeCategoryDto({
    required this.category,
    required this.amount,
  });

  factory IncomeCategoryDto.fromJson(Map<String, dynamic> json) {
    return IncomeCategoryDto(
      category: json['category'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
    );
  }
}

class IncomeReportDto {
  final String fromDate;
  final String toDate;
  final double totalIncome;
  final List<IncomeCategoryDto> categories;

  IncomeReportDto({
    required this.fromDate,
    required this.toDate,
    required this.totalIncome,
    required this.categories,
  });

  factory IncomeReportDto.fromJson(Map<String, dynamic> json) {
    final catList = (json['categories'] as List?) ?? [];
    return IncomeReportDto(
      fromDate: json['fromDate'] ?? '',
      toDate: json['toDate'] ?? '',
      totalIncome: (json['totalIncome'] ?? 0).toDouble(),
      categories: catList.map((e) => IncomeCategoryDto.fromJson(e)).toList(),
    );
  }
}

class GeneralStatementLineDto {
  final String transactionDate;
  final String reference;
  final String description;
  final String accountCode;
  final String accountName;
  final String accountType;
  final double debitAmount;
  final double creditAmount;
  final double runningBalance;

  GeneralStatementLineDto({
    required this.transactionDate,
    required this.reference,
    required this.description,
    required this.accountCode,
    required this.accountName,
    required this.accountType,
    required this.debitAmount,
    required this.creditAmount,
    required this.runningBalance,
  });

  factory GeneralStatementLineDto.fromJson(Map<String, dynamic> json) {
    return GeneralStatementLineDto(
      transactionDate: json['transactionDate'] ?? '',
      reference: json['reference'] ?? '',
      description: json['description'] ?? '',
      accountCode: json['accountCode'] ?? '',
      accountName: json['accountName'] ?? '',
      accountType: json['accountType'] ?? '',
      debitAmount: (json['debitAmount'] ?? 0).toDouble(),
      creditAmount: (json['creditAmount'] ?? 0).toDouble(),
      runningBalance: (json['runningBalance'] ?? 0).toDouble(),
    );
  }
}

class GeneralStatementDto {
  final String? fromDate;
  final String? toDate;
  final double totalDebits;
  final double totalCredits;
  final List<GeneralStatementLineDto> lines;

  GeneralStatementDto({
    this.fromDate,
    this.toDate,
    required this.totalDebits,
    required this.totalCredits,
    required this.lines,
  });

  factory GeneralStatementDto.fromJson(Map<String, dynamic> json) {
    final lineList = (json['lines'] as List?) ?? [];
    return GeneralStatementDto(
      fromDate: json['fromDate'],
      toDate: json['toDate'],
      totalDebits: (json['totalDebits'] ?? 0).toDouble(),
      totalCredits: (json['totalCredits'] ?? 0).toDouble(),
      lines: lineList.map((e) => GeneralStatementLineDto.fromJson(e)).toList(),
    );
  }
}

class RouteItem {
  final String productName;
  final String moduleType;
  final double amount;
  final String status;
  final String? failureReason;
  final String? routedAt;

  RouteItem({
    required this.productName,
    required this.moduleType,
    required this.amount,
    required this.status,
    this.failureReason,
    this.routedAt,
  });

  factory RouteItem.fromJson(Map<String, dynamic> json) {
    return RouteItem(
      productName: json['productName'] ?? '',
      moduleType: json['moduleType'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      status: json['status'] ?? '',
      failureReason: json['failureReason'],
      routedAt: json['routedAt'],
    );
  }
}

class PaymentRouteLookupResponse {
  final String paymentId;
  final String? mpesaRef;
  final String? internalRef;
  final String? memberNumber;
  final String memberName;
  final String? senderPhoneNumber;
  final double totalAmount;
  final String paymentStatus;
  final String? failureReason;
  final String createdAt;
  final bool isSplitDeposit;
  final List<RouteItem> routes;

  PaymentRouteLookupResponse({
    required this.paymentId,
    this.mpesaRef,
    this.internalRef,
    this.memberNumber,
    required this.memberName,
    this.senderPhoneNumber,
    required this.totalAmount,
    required this.paymentStatus,
    this.failureReason,
    required this.createdAt,
    required this.isSplitDeposit,
    required this.routes,
  });

  factory PaymentRouteLookupResponse.fromJson(Map<String, dynamic> json) {
    final routeList = (json['routes'] as List?) ?? [];
    return PaymentRouteLookupResponse(
      paymentId: json['paymentId'] ?? '',
      mpesaRef: json['mpesaRef'],
      internalRef: json['internalRef'],
      memberNumber: json['memberNumber'],
      memberName: json['memberName'] ?? '',
      senderPhoneNumber: json['senderPhoneNumber'],
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      paymentStatus: json['paymentStatus'] ?? '',
      failureReason: json['failureReason'],
      createdAt: json['createdAt'] ?? '',
      isSplitDeposit: json['isSplitDeposit'] ?? false,
      routes: routeList.map((e) => RouteItem.fromJson(e)).toList(),
    );
  }
}
