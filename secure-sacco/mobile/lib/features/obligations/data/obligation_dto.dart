enum ObligationFrequency {
  WEEKLY,
  MONTHLY,
}

enum ObligationStatus {
  ACTIVE,
  PAUSED,
}

enum PeriodStatus {
  UPCOMING,
  DUE,
  COVERED,
  OVERDUE,
}

class ObligationPeriodResponse {
  final String id;
  final String obligationId;
  final DateTime periodStart;
  final DateTime periodEnd;
  final double requiredAmount;
  final double paidAmount;
  final double remaining;
  final PeriodStatus status;
  final PeriodStatus computedStatus;
  final DateTime? createdAt;

  final String? penaltyId;
  final double? penaltyAmount;
  final double? penaltyOutstanding;
  final String? penaltyStatus;

  ObligationPeriodResponse({
    required this.id,
    required this.obligationId,
    required this.periodStart,
    required this.periodEnd,
    required this.requiredAmount,
    required this.paidAmount,
    required this.remaining,
    required this.status,
    required this.computedStatus,
    this.createdAt,
    this.penaltyId,
    this.penaltyAmount,
    this.penaltyOutstanding,
    this.penaltyStatus,
  });

  factory ObligationPeriodResponse.fromJson(Map<String, dynamic> json) {
    return ObligationPeriodResponse(
      id: json['id'],
      obligationId: json['obligationId'],
      periodStart: DateTime.parse(json['periodStart']),
      periodEnd: DateTime.parse(json['periodEnd']),
      requiredAmount: (json['requiredAmount'] as num).toDouble(),
      paidAmount: (json['paidAmount'] as num).toDouble(),
      remaining: (json['remaining'] as num).toDouble(),
      status: PeriodStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => PeriodStatus.DUE,
      ),
      computedStatus: PeriodStatus.values.firstWhere(
        (e) => e.name == json['computedStatus'],
        orElse: () => PeriodStatus.DUE,
      ),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      penaltyId: json['penaltyId'],
      penaltyAmount: json['penaltyAmount'] != null ? (json['penaltyAmount'] as num).toDouble() : null,
      penaltyOutstanding: json['penaltyOutstanding'] != null ? (json['penaltyOutstanding'] as num).toDouble() : null,
      penaltyStatus: json['penaltyStatus'],
    );
  }
}

class ObligationResponse {
  final String id;
  final String memberId;
  final ObligationFrequency frequency;
  final double amountDue;
  final DateTime startDate;
  final int graceDays;
  final ObligationStatus status;
  final DateTime? createdAt;
  final ObligationPeriodResponse? currentPeriod;

  ObligationResponse({
    required this.id,
    required this.memberId,
    required this.frequency,
    required this.amountDue,
    required this.startDate,
    required this.graceDays,
    required this.status,
    this.createdAt,
    this.currentPeriod,
  });

  factory ObligationResponse.fromJson(Map<String, dynamic> json) {
    return ObligationResponse(
      id: json['id'],
      memberId: json['memberId'],
      frequency: ObligationFrequency.values.firstWhere(
        (e) => e.name == json['frequency'],
        orElse: () => ObligationFrequency.MONTHLY,
      ),
      amountDue: (json['amountDue'] as num).toDouble(),
      startDate: DateTime.parse(json['startDate']),
      graceDays: json['graceDays'] as int,
      status: ObligationStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ObligationStatus.ACTIVE,
      ),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      currentPeriod: json['currentPeriod'] != null ? ObligationPeriodResponse.fromJson(json['currentPeriod']) : null,
    );
  }
}

class ObligationComplianceEntry {
  final String memberId;
  final String memberNumber;
  final String memberName;
  final ObligationFrequency frequency;
  final double amountDue;
  final int totalOverduePeriods;
  final double totalShortfall;
  final double totalPenalties;
  final PeriodStatus worstStatus;

  ObligationComplianceEntry({
    required this.memberId,
    required this.memberNumber,
    required this.memberName,
    required this.frequency,
    required this.amountDue,
    required this.totalOverduePeriods,
    required this.totalShortfall,
    required this.totalPenalties,
    required this.worstStatus,
  });

  factory ObligationComplianceEntry.fromJson(Map<String, dynamic> json) {
    return ObligationComplianceEntry(
      memberId: json['memberId'],
      memberNumber: json['memberNumber'],
      memberName: json['memberName'],
      frequency: ObligationFrequency.values.firstWhere(
        (e) => e.name == json['frequency'],
        orElse: () => ObligationFrequency.MONTHLY,
      ),
      amountDue: (json['amountDue'] as num).toDouble(),
      totalOverduePeriods: json['totalOverduePeriods'] as int,
      totalShortfall: (json['totalShortfall'] as num).toDouble(),
      totalPenalties: (json['totalPenalties'] as num?)?.toDouble() ?? 0.0,
      worstStatus: PeriodStatus.values.firstWhere(
        (e) => e.name == json['worstStatus'],
        orElse: () => PeriodStatus.DUE,
      ),
    );
  }
}

class PagedObligationComplianceResponse {
  final List<ObligationComplianceEntry> content;
  final int totalElements;
  final int totalPages;

  PagedObligationComplianceResponse({
    required this.content,
    required this.totalElements,
    required this.totalPages,
  });

  factory PagedObligationComplianceResponse.fromJson(Map<String, dynamic> json) {
    return PagedObligationComplianceResponse(
      content: (json['content'] as List).map((i) => ObligationComplianceEntry.fromJson(i)).toList(),
      totalElements: json['totalElements'],
      totalPages: json['totalPages'],
    );
  }
}

class PagedObligationPeriodResponse {
  final List<ObligationPeriodResponse> content;
  final int totalElements;
  final int totalPages;

  PagedObligationPeriodResponse({
    required this.content,
    required this.totalElements,
    required this.totalPages,
  });

  factory PagedObligationPeriodResponse.fromJson(Map<String, dynamic> json) {
    return PagedObligationPeriodResponse(
      content: (json['content'] as List).map((i) => ObligationPeriodResponse.fromJson(i)).toList(),
      totalElements: json['totalElements'],
      totalPages: json['totalPages'],
    );
  }
}

class CreateObligationRequest {
  final String memberId;
  final String frequency;
  final double amountDue;
  final String startDate;
  final int graceDays;

  CreateObligationRequest({
    required this.memberId,
    required this.frequency,
    required this.amountDue,
    required this.startDate,
    this.graceDays = 0,
  });

  Map<String, dynamic> toJson() {
    return {
      'memberId': memberId,
      'frequency': frequency,
      'amountDue': amountDue,
      'startDate': startDate,
      'graceDays': graceDays,
    };
  }
}

class UpdateObligationRequest {
  final double? amountDue;
  final String? startDate;
  final int? graceDays;

  UpdateObligationRequest({
    this.amountDue,
    this.startDate,
    this.graceDays,
  });

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};
    if (amountDue != null) data['amountDue'] = amountDue;
    if (startDate != null) data['startDate'] = startDate;
    if (graceDays != null) data['graceDays'] = graceDays;
    return data;
  }
}
