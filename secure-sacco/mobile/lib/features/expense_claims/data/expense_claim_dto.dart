class ExpenseAllocationDto {
  final String productId;
  final double amount;

  ExpenseAllocationDto({
    required this.productId,
    required this.amount,
  });

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'amount': amount,
  };

  factory ExpenseAllocationDto.fromJson(Map<String, dynamic> json) => ExpenseAllocationDto(
    productId: json['productId'],
    amount: (json['amount'] as num).toDouble(),
  );
}

class MemberSubmitExpenseClaimRequest {
  final double amount;
  final String description;
  final String? receiptReference;
  final List<ExpenseAllocationDto>? allocations;

  MemberSubmitExpenseClaimRequest({
    required this.amount,
    required this.description,
    this.receiptReference,
    this.allocations,
  });

  Map<String, dynamic> toJson() => {
    'amount': amount,
    'description': description,
    'receiptReference': receiptReference,
    if (allocations != null) 'allocations': allocations!.map((a) => a.toJson()).toList(),
  };
}

class SubmitExpenseClaimRequest {
  final String memberId;
  final double amount;
  final String description;
  final String? receiptReference;
  final List<ExpenseAllocationDto>? allocations;

  SubmitExpenseClaimRequest({
    required this.memberId,
    required this.amount,
    required this.description,
    this.receiptReference,
    this.allocations,
  });

  Map<String, dynamic> toJson() => {
    'memberId': memberId,
    'amount': amount,
    'description': description,
    'receiptReference': receiptReference,
    if (allocations != null) 'allocations': allocations!.map((a) => a.toJson()).toList(),
  };
}

class ReviewExpenseClaimRequest {
  final bool approved;
  final String? rejectionReason;
  final List<ExpenseAllocationDto>? overrideAllocations;

  ReviewExpenseClaimRequest({
    required this.approved,
    this.rejectionReason,
    this.overrideAllocations,
  });

  Map<String, dynamic> toJson() => {
    'approved': approved,
    'rejectionReason': rejectionReason,
    if (overrideAllocations != null) 'overrideAllocations': overrideAllocations!.map((a) => a.toJson()).toList(),
  };
}

class ExpenseClaimResponse {
  final String id;
  final String memberId;
  final String? memberNumber;
  final String? memberName;
  final double amount;
  final String description;
  final String? receiptReference;
  final String status;
  final String? rejectionReason;
  final String? reviewedByUserId;
  final String? reviewedAt;
  final String? journalReference;
  final String createdAt;
  final List<ExpenseAllocationDto>? requestedAllocations;

  ExpenseClaimResponse({
    required this.id,
    required this.memberId,
    this.memberNumber,
    this.memberName,
    required this.amount,
    required this.description,
    this.receiptReference,
    required this.status,
    this.rejectionReason,
    this.reviewedByUserId,
    this.reviewedAt,
    this.journalReference,
    required this.createdAt,
    this.requestedAllocations,
  });

  factory ExpenseClaimResponse.fromJson(Map<String, dynamic> json) => ExpenseClaimResponse(
    id: json['id'],
    memberId: json['memberId'],
    memberNumber: json['memberNumber'],
    memberName: json['memberName'],
    amount: (json['amount'] as num).toDouble(),
    description: json['description'],
    receiptReference: json['receiptReference'],
    status: json['status'],
    rejectionReason: json['rejectionReason'],
    reviewedByUserId: json['reviewedByUserId'],
    reviewedAt: json['reviewedAt'],
    journalReference: json['journalReference'],
    createdAt: json['createdAt'],
    requestedAllocations: json['requestedAllocations'] != null 
        ? (json['requestedAllocations'] as List).map((i) => ExpenseAllocationDto.fromJson(i)).toList() 
        : null,
  );
}
