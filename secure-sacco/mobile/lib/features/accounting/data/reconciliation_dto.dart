class ReconciliationLineDto {
  final String productName;
  final String glAccountCode;
  final String glAccountName;
  final double subLedgerBalance;
  final double glBalance;
  final double variance;
  final bool isReconciled;

  ReconciliationLineDto({
    required this.productName,
    required this.glAccountCode,
    required this.glAccountName,
    required this.subLedgerBalance,
    required this.glBalance,
    required this.variance,
    required this.isReconciled,
  });

  factory ReconciliationLineDto.fromJson(Map<String, dynamic> json) {
    return ReconciliationLineDto(
      productName: json['productName'] as String,
      glAccountCode: json['glAccountCode'] as String,
      glAccountName: json['glAccountName'] as String,
      subLedgerBalance: (json['subLedgerBalance'] as num).toDouble(),
      glBalance: (json['glBalance'] as num).toDouble(),
      variance: (json['variance'] as num).toDouble(),
      isReconciled: json['isReconciled'] as bool,
    );
  }
}

class InternalReconciliationResponseDto {
  final String timestamp;
  final List<ReconciliationLineDto> savingsReconciliation;
  final List<ReconciliationLineDto> shareReconciliation;
  final List<ReconciliationLineDto> loanReconciliation;

  InternalReconciliationResponseDto({
    required this.timestamp,
    required this.savingsReconciliation,
    required this.shareReconciliation,
    required this.loanReconciliation,
  });

  factory InternalReconciliationResponseDto.fromJson(Map<String, dynamic> json) {
    var savingsList = json['savingsReconciliation'] as List? ?? [];
    var shareList = json['shareReconciliation'] as List? ?? [];
    var loanList = json['loanReconciliation'] as List? ?? [];
    
    return InternalReconciliationResponseDto(
      timestamp: json['timestamp'] as String,
      savingsReconciliation: savingsList.map((i) => ReconciliationLineDto.fromJson(i)).toList(),
      shareReconciliation: shareList.map((i) => ReconciliationLineDto.fromJson(i)).toList(),
      loanReconciliation: loanList.map((i) => ReconciliationLineDto.fromJson(i)).toList(),
    );
  }
}
