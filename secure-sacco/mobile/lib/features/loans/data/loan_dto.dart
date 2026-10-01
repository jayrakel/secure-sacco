class LoanProduct {
  final String id;
  final String name;
  final String description;
  final String repaymentFrequency;
  final int termWeeks;
  final String interestModel;
  final double interestRate;
  final double applicationFee;
  final int gracePeriodDays;
  final bool isActive;
  final double? minAmount;
  final double? maxAmount;

  LoanProduct({
    required this.id,
    required this.name,
    required this.description,
    required this.repaymentFrequency,
    required this.termWeeks,
    required this.interestModel,
    required this.interestRate,
    required this.applicationFee,
    required this.gracePeriodDays,
    required this.isActive,
    this.minAmount,
    this.maxAmount,
  });

  factory LoanProduct.fromJson(Map<String, dynamic> json) {
    return LoanProduct(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      repaymentFrequency: json['repaymentFrequency']?.toString() ?? '',
      termWeeks: json['termWeeks'] as int? ?? 0,
      interestModel: json['interestModel']?.toString() ?? '',
      interestRate: (json['interestRate'] as num?)?.toDouble() ?? 0.0,
      applicationFee: (json['applicationFee'] as num?)?.toDouble() ?? 0.0,
      gracePeriodDays: json['gracePeriodDays'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? false,
      minAmount: (json['minAmount'] as num?)?.toDouble(),
      maxAmount: (json['maxAmount'] as num?)?.toDouble(),
    );
  }
}

class LoanProductRequest {
  final String name;
  final String description;
  final String repaymentFrequency;
  final int termWeeks;
  final String interestModel;
  final double interestRate;
  final double applicationFee;
  final int gracePeriodDays;
  final bool isActive;
  final double? minAmount;
  final double? maxAmount;

  LoanProductRequest({
    required this.name,
    required this.description,
    required this.repaymentFrequency,
    required this.termWeeks,
    required this.interestModel,
    required this.interestRate,
    required this.applicationFee,
    required this.gracePeriodDays,
    required this.isActive,
    this.minAmount,
    this.maxAmount,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'repaymentFrequency': repaymentFrequency,
      'termWeeks': termWeeks,
      'interestModel': interestModel,
      'interestRate': interestRate,
      'applicationFee': applicationFee,
      'gracePeriodDays': gracePeriodDays,
      'isActive': isActive,
      if (minAmount != null) 'minAmount': minAmount,
      if (maxAmount != null) 'maxAmount': maxAmount,
    };
  }
}

class LoanGuarantor {
  final String id;
  final String guarantorMemberId;
  final String guarantorMemberNumber;
  final String guarantorName;
  final double guaranteedAmount;
  final String status;

  LoanGuarantor({
    required this.id,
    required this.guarantorMemberId,
    required this.guarantorMemberNumber,
    required this.guarantorName,
    required this.guaranteedAmount,
    required this.status,
  });

  factory LoanGuarantor.fromJson(Map<String, dynamic> json) {
    return LoanGuarantor(
      id: json['id']?.toString() ?? '',
      guarantorMemberId: json['guarantorMemberId']?.toString() ?? '',
      guarantorMemberNumber: json['guarantorMemberNumber']?.toString() ?? '',
      guarantorName: json['guarantorName']?.toString() ?? '',
      guaranteedAmount: (json['guaranteedAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? '',
    );
  }
}

class LoanApplication {
  final String id;
  final String memberId;
  final String? memberNumber;
  final String? memberName;
  final String productId;
  final String productName;
  final int termWeeks;
  final int gracePeriodDays;
  final double principalAmount;
  final double applicationFee;
  final bool applicationFeePaid;
  final double? interestRate;
  final String status;
  final String purpose;
  final String createdAt;
  final String? updatedAt;
  final String? appliedAt;
  final String? comments;
  final String? collateralType;
  final double? collateralValue;
  final double? feePaidAmount;
  final List<LoanGuarantor> guarantors;
  final int? tenorMonths;

  LoanApplication({
    required this.id,
    required this.memberId,
    this.memberNumber,
    this.memberName,
    required this.productId,
    required this.productName,
    required this.termWeeks,
    required this.gracePeriodDays,
    required this.principalAmount,
    required this.applicationFee,
    required this.applicationFeePaid,
    this.interestRate,
    required this.status,
    required this.purpose,
    required this.createdAt,
    this.updatedAt,
    this.appliedAt,
    this.comments,
    this.collateralType,
    this.collateralValue,
    this.feePaidAmount,
    required this.guarantors,
    this.tenorMonths,
  });

  factory LoanApplication.fromJson(Map<String, dynamic> json) {
    return LoanApplication(
      id: json['id']?.toString() ?? '',
      memberId: json['memberId']?.toString() ?? '',
      memberNumber: json['memberNumber']?.toString(),
      memberName: json['memberName']?.toString(),
      productId: json['productId']?.toString() ?? '',
      productName: json['productName']?.toString() ?? '',
      termWeeks: json['termWeeks'] as int? ?? 0,
      gracePeriodDays: json['gracePeriodDays'] as int? ?? 0,
      principalAmount: (json['principalAmount'] as num?)?.toDouble() ?? 0.0,
      applicationFee: (json['applicationFee'] as num?)?.toDouble() ?? 0.0,
      applicationFeePaid: json['applicationFeePaid'] as bool? ?? false,
      interestRate: (json['interestRate'] as num?)?.toDouble(),
      status: json['status']?.toString() ?? '',
      purpose: json['purpose']?.toString() ?? '',
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString(),
      appliedAt: json['appliedAt']?.toString(),
      comments: json['comments']?.toString(),
      collateralType: json['collateralType']?.toString(),
      collateralValue: (json['collateralValue'] as num?)?.toDouble(),
      feePaidAmount: (json['feePaidAmount'] as num?)?.toDouble(),
      guarantors: (json['guarantors'] as List<dynamic>?)
              ?.map((e) => LoanGuarantor.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      tenorMonths: json['tenorMonths'] as int?,
    );
  }
}

class LoanSummary {
  final String applicationId;
  final String productName;
  final double principalAmount;
  final double totalOutstanding;
  final double totalArrears;
  final double prepaymentCredit;
  final String? nextDueDate;
  final double nextDueAmount;
  final String status;

  LoanSummary({
    required this.applicationId,
    required this.productName,
    required this.principalAmount,
    required this.totalOutstanding,
    required this.totalArrears,
    required this.prepaymentCredit,
    this.nextDueDate,
    required this.nextDueAmount,
    required this.status,
  });

  factory LoanSummary.fromJson(Map<String, dynamic> json) {
    return LoanSummary(
      applicationId: json['applicationId']?.toString() ?? '',
      productName: json['productName']?.toString() ?? '',
      principalAmount: (json['principalAmount'] as num?)?.toDouble() ?? 0.0,
      totalOutstanding: (json['totalOutstanding'] as num?)?.toDouble() ?? 0.0,
      totalArrears: (json['totalArrears'] as num?)?.toDouble() ?? 0.0,
      prepaymentCredit: (json['prepaymentCredit'] as num?)?.toDouble() ?? 0.0,
      nextDueDate: json['nextDueDate']?.toString(),
      nextDueAmount: (json['nextDueAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? '',
    );
  }
}

class CreateApplicationRequest {
  final String productId;
  final double principalAmount;
  final String purpose;

  CreateApplicationRequest({
    required this.productId,
    required this.principalAmount,
    required this.purpose,
  });

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'principalAmount': principalAmount,
      'purpose': purpose,
    };
  }
}

class AddGuarantorRequest {
  final String memberNumber;
  final double guaranteedAmount;

  AddGuarantorRequest({
    required this.memberNumber,
    required this.guaranteedAmount,
  });

  Map<String, dynamic> toJson() {
    return {
      'memberNumber': memberNumber,
      'guaranteedAmount': guaranteedAmount,
    };
  }
}

class LoanEligibility {
  final bool isEligible;
  final double maxBorrowingLimit;
  final String? ineligibilityReason;
  final int creditScore;
  final int starRating;

  LoanEligibility({
    required this.isEligible,
    required this.maxBorrowingLimit,
    this.ineligibilityReason,
    required this.creditScore,
    required this.starRating,
  });

  factory LoanEligibility.fromJson(Map<String, dynamic> json) {
    return LoanEligibility(
      isEligible: json['isEligible'] ?? false,
      maxBorrowingLimit: (json['maxBorrowingLimit'] as num?)?.toDouble() ?? 0.0,
      ineligibilityReason: json['ineligibilityReason'],
      creditScore: json['creditScore'] ?? 0,
      starRating: json['starRating'] ?? 0,
    );
  }
}

class MyGuarantorRequestResponse {
  final String id;
  final String loanApplicationId;
  final String applicantName;
  final double loanAmount;
  final double requestedAmount;
  final String requestDate;
  final String status;

  MyGuarantorRequestResponse({
    required this.id,
    required this.loanApplicationId,
    required this.applicantName,
    required this.loanAmount,
    required this.requestedAmount,
    required this.requestDate,
    required this.status,
  });

  factory MyGuarantorRequestResponse.fromJson(Map<String, dynamic> json) {
    return MyGuarantorRequestResponse(
      id: json['id']?.toString() ?? '',
      loanApplicationId: json['loanApplicationId']?.toString() ?? '',
      applicantName: json['applicantName']?.toString() ?? '',
      loanAmount: (json['loanAmount'] as num?)?.toDouble() ?? 0.0,
      requestedAmount: (json['requestedAmount'] as num?)?.toDouble() ?? 0.0,
      requestDate: json['requestDate']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
    );
  }
}

