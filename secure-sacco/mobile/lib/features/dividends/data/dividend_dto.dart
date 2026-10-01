class DeclareDividendRequest {
  final int financialYear;
  final double ratePercentage;
  final String calculationMode;

  DeclareDividendRequest({
    required this.financialYear,
    required this.ratePercentage,
    this.calculationMode = 'SHARE_CAPITAL',
  });

  Map<String, dynamic> toJson() {
    return {
      'financialYear': financialYear,
      'ratePercentage': ratePercentage,
      'calculationMode': calculationMode,
    };
  }
}

class PreviewDividendItem {
  final String memberId;
  final String memberNumber;
  final String memberName;
  final double grossDividend;
  final double arrears;
  final double netDividend;
  final double baseAmount;

  PreviewDividendItem({
    required this.memberId,
    required this.memberNumber,
    required this.memberName,
    required this.grossDividend,
    required this.arrears,
    required this.netDividend,
    required this.baseAmount,
  });

  factory PreviewDividendItem.fromJson(Map<String, dynamic> json) {
    return PreviewDividendItem(
      memberId: json['memberId'] ?? '',
      memberNumber: json['memberNumber'] ?? '',
      memberName: json['memberName'] ?? '',
      grossDividend: (json['grossDividend'] ?? 0).toDouble(),
      arrears: (json['arrears'] ?? 0).toDouble(),
      netDividend: (json['netDividend'] ?? 0).toDouble(),
      baseAmount: (json['baseAmount'] ?? 0).toDouble(),
    );
  }
}

class PreviewDividendResponse {
  final double totalDividend;
  final List<PreviewDividendItem> items;

  PreviewDividendResponse({
    required this.totalDividend,
    required this.items,
  });

  factory PreviewDividendResponse.fromJson(Map<String, dynamic> json) {
    var itemsList = json['items'] as List? ?? [];
    return PreviewDividendResponse(
      totalDividend: (json['totalDividend'] ?? 0).toDouble(),
      items: itemsList.map((i) => PreviewDividendItem.fromJson(i)).toList(),
    );
  }
}

class DividendDeclaration {
  final String id;
  final int financialYear;
  final double ratePercentage;
  final double totalAllocated;
  final String calculationMode;
  final String status;
  final String? createdAt;

  DividendDeclaration({
    required this.id,
    required this.financialYear,
    required this.ratePercentage,
    required this.totalAllocated,
    required this.calculationMode,
    required this.status,
    this.createdAt,
  });

  factory DividendDeclaration.fromJson(Map<String, dynamic> json) {
    return DividendDeclaration(
      id: json['id'] ?? '',
      financialYear: json['financialYear'] ?? 0,
      ratePercentage: (json['ratePercentage'] ?? 0).toDouble(),
      totalAllocated: (json['totalAllocated'] ?? 0).toDouble(),
      calculationMode: json['calculationMode'] ?? 'SHARE_CAPITAL',
      status: json['status'] ?? 'DRAFT',
      createdAt: json['createdAt'],
    );
  }
}
