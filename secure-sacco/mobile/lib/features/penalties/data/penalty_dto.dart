class PenaltySummary {
  final String id;
  final String ruleCode;
  final String ruleName;
  final double originalAmount;
  final double outstandingAmount;
  final double principalPaid;
  final double interestPaid;
  final double amountWaived;
  final String status;
  final String? createdAt;

  PenaltySummary({
    required this.id,
    required this.ruleCode,
    required this.ruleName,
    required this.originalAmount,
    required this.outstandingAmount,
    required this.principalPaid,
    required this.interestPaid,
    required this.amountWaived,
    required this.status,
    this.createdAt,
  });

  factory PenaltySummary.fromJson(Map<String, dynamic> json) {
    return PenaltySummary(
      id: json['id'] ?? '',
      ruleCode: json['ruleCode'] ?? '',
      ruleName: json['ruleName'] ?? '',
      originalAmount: (json['originalAmount'] as num?)?.toDouble() ?? 0.0,
      outstandingAmount: (json['outstandingAmount'] as num?)?.toDouble() ?? 0.0,
      principalPaid: (json['principalPaid'] as num?)?.toDouble() ?? 0.0,
      interestPaid: (json['interestPaid'] as num?)?.toDouble() ?? 0.0,
      amountWaived: (json['amountWaived'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? '',
      createdAt: json['createdAt'],
    );
  }
}

class StaffPenalty {
  final String id;
  final String memberId;
  final String memberNumber;
  final String memberName;
  final String ruleCode;
  final String ruleName;
  final double originalAmount;
  final double outstandingAmount;
  final double amountWaived;
  final String status;
  final String? createdAt;

  StaffPenalty({
    required this.id,
    required this.memberId,
    required this.memberNumber,
    required this.memberName,
    required this.ruleCode,
    required this.ruleName,
    required this.originalAmount,
    required this.outstandingAmount,
    required this.amountWaived,
    required this.status,
    this.createdAt,
  });

  factory StaffPenalty.fromJson(Map<String, dynamic> json) {
    return StaffPenalty(
      id: json['id'] ?? '',
      memberId: json['memberId'] ?? '',
      memberNumber: json['memberNumber'] ?? '',
      memberName: json['memberName'] ?? '',
      ruleCode: json['ruleCode'] ?? '',
      ruleName: json['ruleName'] ?? '',
      originalAmount: (json['originalAmount'] as num?)?.toDouble() ?? 0.0,
      outstandingAmount: (json['outstandingAmount'] as num?)?.toDouble() ?? 0.0,
      amountWaived: (json['amountWaived'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? '',
      createdAt: json['createdAt'],
    );
  }
}

class PenaltyRule {
  final String id;
  final String code;
  final String name;
  final String? description;
  final String baseAmountType;
  final double baseAmountValue;
  final int gracePeriodDays;
  final int interestPeriodDays;
  final double interestRate;
  final String interestMode;
  final bool isActive;

  PenaltyRule({
    required this.id,
    required this.code,
    required this.name,
    this.description,
    required this.baseAmountType,
    required this.baseAmountValue,
    required this.gracePeriodDays,
    required this.interestPeriodDays,
    required this.interestRate,
    required this.interestMode,
    required this.isActive,
  });

  factory PenaltyRule.fromJson(Map<String, dynamic> json) {
    return PenaltyRule(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      baseAmountType: json['baseAmountType'] ?? 'FIXED',
      baseAmountValue: (json['baseAmountValue'] as num?)?.toDouble() ?? 0.0,
      gracePeriodDays: json['gracePeriodDays'] ?? 0,
      interestPeriodDays: json['interestPeriodDays'] ?? 0,
      interestRate: (json['interestRate'] as num?)?.toDouble() ?? 0.0,
      interestMode: json['interestMode'] ?? 'NONE',
      isActive: json['isActive'] ?? true,
    );
  }
}

class PenaltyRuleRequest {
  final String code;
  final String name;
  final String? description;
  final String baseAmountType;
  final double baseAmountValue;
  final int gracePeriodDays;
  final int interestPeriodDays;
  final double interestRate;
  final String interestMode;
  final bool? isActive;

  PenaltyRuleRequest({
    required this.code,
    required this.name,
    this.description,
    required this.baseAmountType,
    required this.baseAmountValue,
    required this.gracePeriodDays,
    required this.interestPeriodDays,
    required this.interestRate,
    required this.interestMode,
    this.isActive,
  });

  Map<String, dynamic> toJson() {
    final data = <String, dynamic>{
      'code': code,
      'name': name,
      'baseAmountType': baseAmountType,
      'baseAmountValue': baseAmountValue,
      'gracePeriodDays': gracePeriodDays,
      'interestPeriodDays': interestPeriodDays,
      'interestRate': interestRate,
      'interestMode': interestMode,
    };
    if (description != null) data['description'] = description;
    if (isActive != null) data['isActive'] = isActive;
    return data;
  }
}
