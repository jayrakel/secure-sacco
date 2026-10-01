enum ModuleType {
  SAVINGS,
  LOAN,
  PENALTY,
  SHARES,
  CUSTOM
}

enum ProductFrequency {
  ONCE,
  DAILY,
  WEEKLY,
  MONTHLY,
  YEARLY
}

class CreateProductRequest {
  final String name;
  final String code;
  final String? description;
  final ModuleType moduleType;
  final String glAccountId; // UUID string
  final int? displayOrder;
  final double? requiredAmount;
  final ProductFrequency? frequency;
  final bool? hasDeadlines;
  final int? graceDays;
  final bool? attractsPenalties;
  final String? penaltyRuleId; // UUID string

  CreateProductRequest({
    required this.name,
    required this.code,
    this.description,
    required this.moduleType,
    required this.glAccountId,
    this.displayOrder,
    this.requiredAmount,
    this.frequency,
    this.hasDeadlines,
    this.graceDays,
    this.attractsPenalties,
    this.penaltyRuleId,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'code': code,
      if (description != null) 'description': description,
      'moduleType': moduleType.name,
      'glAccountId': glAccountId,
      if (displayOrder != null) 'displayOrder': displayOrder,
      if (requiredAmount != null) 'requiredAmount': requiredAmount,
      if (frequency != null) 'frequency': frequency!.name,
      if (hasDeadlines != null) 'hasDeadlines': hasDeadlines,
      if (graceDays != null) 'graceDays': graceDays,
      if (attractsPenalties != null) 'attractsPenalties': attractsPenalties,
      if (penaltyRuleId != null) 'penaltyRuleId': penaltyRuleId,
    };
  }
}

class UpdateProductRequest {
  final String? name;
  final String? description;
  final String? glAccountId;
  final bool? isActive;
  final int? displayOrder;
  final double? requiredAmount;
  final bool? clearRequiredAmount;
  final ProductFrequency? frequency;
  final bool? hasDeadlines;
  final int? graceDays;
  final bool? attractsPenalties;
  final String? penaltyRuleId;

  UpdateProductRequest({
    this.name,
    this.description,
    this.glAccountId,
    this.isActive,
    this.displayOrder,
    this.requiredAmount,
    this.clearRequiredAmount,
    this.frequency,
    this.hasDeadlines,
    this.graceDays,
    this.attractsPenalties,
    this.penaltyRuleId,
  });

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};
    if (name != null) data['name'] = name;
    if (description != null) data['description'] = description;
    if (glAccountId != null) data['glAccountId'] = glAccountId;
    if (isActive != null) data['isActive'] = isActive;
    if (displayOrder != null) data['displayOrder'] = displayOrder;
    if (requiredAmount != null) data['requiredAmount'] = requiredAmount;
    if (clearRequiredAmount != null) data['clearRequiredAmount'] = clearRequiredAmount;
    if (frequency != null) data['frequency'] = frequency!.name;
    if (hasDeadlines != null) data['hasDeadlines'] = hasDeadlines;
    if (graceDays != null) data['graceDays'] = graceDays;
    if (attractsPenalties != null) data['attractsPenalties'] = attractsPenalties;
    if (penaltyRuleId != null) data['penaltyRuleId'] = penaltyRuleId;
    return data;
  }
}

class ProductResponse {
  final String id;
  final String name;
  final String code;
  final String? description;
  final ModuleType moduleType;
  final String glAccountId;
  final String glAccountCode;
  final String glAccountName;
  final bool isActive;
  final bool isSystem;
  final int displayOrder;
  final double? requiredAmount;
  final ProductFrequency? frequency;
  final bool? hasDeadlines;
  final int? graceDays;
  final bool? attractsPenalties;
  final String? penaltyRuleId;
  final DateTime createdAt;

  ProductResponse({
    required this.id,
    required this.name,
    required this.code,
    this.description,
    required this.moduleType,
    required this.glAccountId,
    required this.glAccountCode,
    required this.glAccountName,
    required this.isActive,
    required this.isSystem,
    required this.displayOrder,
    this.requiredAmount,
    this.frequency,
    this.hasDeadlines,
    this.graceDays,
    this.attractsPenalties,
    this.penaltyRuleId,
    required this.createdAt,
  });

  factory ProductResponse.fromJson(Map<String, dynamic> json) {
    return ProductResponse(
      id: json['id'],
      name: json['name'],
      code: json['code'],
      description: json['description'],
      moduleType: ModuleType.values.firstWhere((e) => e.name == json['moduleType'], orElse: () => ModuleType.CUSTOM),
      glAccountId: json['glAccountId'],
      glAccountCode: json['glAccountCode'],
      glAccountName: json['glAccountName'],
      isActive: json['isActive'] ?? false,
      isSystem: json['isSystem'] ?? false,
      displayOrder: json['displayOrder'] ?? 0,
      requiredAmount: json['requiredAmount'] != null ? (json['requiredAmount'] as num).toDouble() : null,
      frequency: json['frequency'] != null 
          ? ProductFrequency.values.firstWhere((e) => e.name == json['frequency'], orElse: () => ProductFrequency.ONCE)
          : null,
      hasDeadlines: json['hasDeadlines'],
      graceDays: json['graceDays'],
      attractsPenalties: json['attractsPenalties'],
      penaltyRuleId: json['penaltyRuleId'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class ProductAllocationContext {
  final String productId;
  final String productCode;
  final String productName;
  final ModuleType moduleType;
  final bool isCapped;
  final double? outstandingAmount;
  final double? requiredAmount;
  final double? paidAmount;

  ProductAllocationContext({
    required this.productId,
    required this.productCode,
    required this.productName,
    required this.moduleType,
    required this.isCapped,
    this.outstandingAmount,
    this.requiredAmount,
    this.paidAmount,
  });

  factory ProductAllocationContext.fromJson(Map<String, dynamic> json) {
    return ProductAllocationContext(
      productId: json['productId'],
      productCode: json['productCode'],
      productName: json['productName'],
      moduleType: ModuleType.values.firstWhere((e) => e.name == json['moduleType'], orElse: () => ModuleType.CUSTOM),
      isCapped: json['isCapped'] ?? false,
      outstandingAmount: json['outstandingAmount'] != null ? (json['outstandingAmount'] as num).toDouble() : null,
      requiredAmount: json['requiredAmount'] != null ? (json['requiredAmount'] as num).toDouble() : null,
      paidAmount: json['paidAmount'] != null ? (json['paidAmount'] as num).toDouble() : null,
    );
  }
}

class AllocationLine {
  final String productId;
  final double amount;

  AllocationLine({
    required this.productId,
    required this.amount,
  });

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'amount': amount,
    };
  }
}

class ValidateAllocationRequest {
  final double totalAmount;
  final List<AllocationLine> allocations;

  ValidateAllocationRequest({
    required this.totalAmount,
    required this.allocations,
  });

  Map<String, dynamic> toJson() {
    return {
      'totalAmount': totalAmount,
      'allocations': allocations.map((e) => e.toJson()).toList(),
    };
  }
}

class ValidateAllocationResponse {
  final bool valid;
  final String? errorMessage;
  final List<String> fieldErrors;

  ValidateAllocationResponse({
    required this.valid,
    this.errorMessage,
    required this.fieldErrors,
  });

  factory ValidateAllocationResponse.fromJson(Map<String, dynamic> json) {
    return ValidateAllocationResponse(
      valid: json['valid'] ?? false,
      errorMessage: json['errorMessage'],
      fieldErrors: (json['fieldErrors'] as List?)?.map((e) => e as String).toList() ?? [],
    );
  }
}

class InitiateSplitDepositRequest {
  final double totalAmount;
  final String phoneNumber;
  final List<AllocationLine> allocations;

  InitiateSplitDepositRequest({
    required this.totalAmount,
    required this.phoneNumber,
    required this.allocations,
  });

  Map<String, dynamic> toJson() {
    return {
      'totalAmount': totalAmount,
      'phoneNumber': phoneNumber,
      'allocations': allocations.map((e) => e.toJson()).toList(),
    };
  }
}

class ProductTransactionItem {
  final String allocationId;
  final String memberNumber;
  final String memberName;
  final double amount;
  final String status;
  final String reference;
  final DateTime createdAt;
  final DateTime? routedAt;

  ProductTransactionItem({
    required this.allocationId,
    required this.memberNumber,
    required this.memberName,
    required this.amount,
    required this.status,
    required this.reference,
    required this.createdAt,
    this.routedAt,
  });

  factory ProductTransactionItem.fromJson(Map<String, dynamic> json) {
    return ProductTransactionItem(
      allocationId: json['allocationId'],
      memberNumber: json['memberNumber'] ?? '',
      memberName: json['memberName'] ?? '',
      amount: (json['amount'] as num).toDouble(),
      status: json['status'],
      reference: json['reference'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
      routedAt: json['routedAt'] != null ? DateTime.parse(json['routedAt']) : null,
    );
  }
}

class ProductTransactionPage {
  final List<ProductTransactionItem> items;
  final int totalElements;
  final int totalPages;
  final int page;
  final int size;
  final double totalAmount;

  ProductTransactionPage({
    required this.items,
    required this.totalElements,
    required this.totalPages,
    required this.page,
    required this.size,
    required this.totalAmount,
  });

  factory ProductTransactionPage.fromJson(Map<String, dynamic> json) {
    return ProductTransactionPage(
      items: (json['items'] as List?)?.map((i) => ProductTransactionItem.fromJson(i)).toList() ?? [],
      totalElements: json['totalElements'] ?? 0,
      totalPages: json['totalPages'] ?? 0,
      page: json['page'] ?? 0,
      size: json['size'] ?? 20,
      totalAmount: json['totalAmount'] != null ? (json['totalAmount'] as num).toDouble() : 0.0,
    );
  }
}

class AllocationStatusItem {
  final String productName;
  final double amount;
  final String status;

  AllocationStatusItem({
    required this.productName,
    required this.amount,
    required this.status,
  });

  factory AllocationStatusItem.fromJson(Map<String, dynamic> json) {
    return AllocationStatusItem(
      productName: json['productName'],
      amount: (json['amount'] as num).toDouble(),
      status: json['status'],
    );
  }
}

class SplitDepositHistoryItem {
  final String paymentId;
  final String accountReference;
  final double totalAmount;
  final String status;
  final String? failureReason;
  final DateTime createdAt;
  final List<AllocationStatusItem> allocations;

  SplitDepositHistoryItem({
    required this.paymentId,
    required this.accountReference,
    required this.totalAmount,
    required this.status,
    this.failureReason,
    required this.createdAt,
    required this.allocations,
  });

  factory SplitDepositHistoryItem.fromJson(Map<String, dynamic> json) {
    return SplitDepositHistoryItem(
      paymentId: json['paymentId'],
      accountReference: json['accountReference'] ?? '',
      totalAmount: (json['totalAmount'] as num).toDouble(),
      status: json['status'],
      failureReason: json['failureReason'],
      createdAt: DateTime.parse(json['createdAt']),
      allocations: (json['allocations'] as List?)?.map((i) => AllocationStatusItem.fromJson(i)).toList() ?? [],
    );
  }
}
