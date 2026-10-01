// Trial Balance DTOs
class TrialBalanceLineDto {
  final String accountCode;
  final String accountName;
  final String accountType; // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  final double totalDebits;
  final double totalCredits;
  final double netBalance;

  TrialBalanceLineDto({
    required this.accountCode,
    required this.accountName,
    required this.accountType,
    required this.totalDebits,
    required this.totalCredits,
    required this.netBalance,
  });

  factory TrialBalanceLineDto.fromJson(Map<String, dynamic> json) {
    return TrialBalanceLineDto(
      accountCode: json['accountCode'] as String,
      accountName: json['accountName'] as String,
      accountType: json['accountType'] as String,
      totalDebits: (json['totalDebits'] as num).toDouble(),
      totalCredits: (json['totalCredits'] as num).toDouble(),
      netBalance: (json['netBalance'] as num).toDouble(),
    );
  }
}

class TrialBalanceResponseDto {
  final String asOfDate;
  final List<TrialBalanceLineDto> lines;
  final double grandTotalDebits;
  final double grandTotalCredits;
  final bool balanced;

  TrialBalanceResponseDto({
    required this.asOfDate,
    required this.lines,
    required this.grandTotalDebits,
    required this.grandTotalCredits,
    required this.balanced,
  });

  factory TrialBalanceResponseDto.fromJson(Map<String, dynamic> json) {
    var linesList = json['lines'] as List? ?? [];
    return TrialBalanceResponseDto(
      asOfDate: json['asOfDate'] as String,
      lines: linesList.map((i) => TrialBalanceLineDto.fromJson(i)).toList(),
      grandTotalDebits: (json['grandTotalDebits'] as num).toDouble(),
      grandTotalCredits: (json['grandTotalCredits'] as num).toDouble(),
      balanced: json['balanced'] as bool,
    );
  }
}

// Income Statement DTOs
class IncomeStatementAccountBalanceDto {
  final String accountCode;
  final String accountName;
  final double balance;
  final String accountType;

  IncomeStatementAccountBalanceDto({
    required this.accountCode,
    required this.accountName,
    required this.balance,
    required this.accountType,
  });

  factory IncomeStatementAccountBalanceDto.fromJson(Map<String, dynamic> json) {
    return IncomeStatementAccountBalanceDto(
      accountCode: json['accountCode'] as String,
      accountName: json['accountName'] as String,
      balance: (json['balance'] as num).toDouble(),
      accountType: json['accountType'] as String,
    );
  }
}

class IncomeStatementResponseDto {
  final double totalRevenue;
  final double totalExpenses;
  final double netIncome;
  final List<IncomeStatementAccountBalanceDto> revenues;
  final List<IncomeStatementAccountBalanceDto> expenses;

  IncomeStatementResponseDto({
    required this.totalRevenue,
    required this.totalExpenses,
    required this.netIncome,
    required this.revenues,
    required this.expenses,
  });

  factory IncomeStatementResponseDto.fromJson(Map<String, dynamic> json) {
    var revList = json['revenues'] as List? ?? [];
    var expList = json['expenses'] as List? ?? [];
    return IncomeStatementResponseDto(
      totalRevenue: (json['totalRevenue'] as num).toDouble(),
      totalExpenses: (json['totalExpenses'] as num).toDouble(),
      netIncome: (json['netIncome'] as num).toDouble(),
      revenues: revList.map((i) => IncomeStatementAccountBalanceDto.fromJson(i)).toList(),
      expenses: expList.map((i) => IncomeStatementAccountBalanceDto.fromJson(i)).toList(),
    );
  }
}

// Balance Sheet DTOs
class BalanceSheetAccountBalanceDto {
  final String accountCode;
  final String accountName;
  final double balance;

  BalanceSheetAccountBalanceDto({
    required this.accountCode,
    required this.accountName,
    required this.balance,
  });

  factory BalanceSheetAccountBalanceDto.fromJson(Map<String, dynamic> json) {
    return BalanceSheetAccountBalanceDto(
      accountCode: json['accountCode'] as String,
      accountName: json['accountName'] as String,
      balance: (json['balance'] as num).toDouble(),
    );
  }
}

class BalanceSheetSectionDto {
  final List<BalanceSheetAccountBalanceDto> items;
  final double total;

  BalanceSheetSectionDto({
    required this.items,
    required this.total,
  });

  factory BalanceSheetSectionDto.fromJson(Map<String, dynamic> json) {
    var itemsList = (json['accounts'] ?? json['items']) as List? ?? [];
    return BalanceSheetSectionDto(
      items: itemsList.map((i) => BalanceSheetAccountBalanceDto.fromJson(i)).toList(),
      total: ((json['totalBalance'] ?? json['total']) as num).toDouble(),
    );
  }
}

class BalanceSheetResponseDto {
  final String asOfDate;
  final BalanceSheetSectionDto assets;
  final BalanceSheetSectionDto liabilities;
  final BalanceSheetSectionDto equity;
  final double netIncome;
  final bool balanced;
  final double? actualBankBalance;

  BalanceSheetResponseDto({
    required this.asOfDate,
    required this.assets,
    required this.liabilities,
    required this.equity,
    required this.netIncome,
    required this.balanced,
    this.actualBankBalance,
  });

  factory BalanceSheetResponseDto.fromJson(Map<String, dynamic> json) {
    return BalanceSheetResponseDto(
      asOfDate: json['asOfDate'] as String,
      assets: BalanceSheetSectionDto.fromJson(json['assets']),
      liabilities: BalanceSheetSectionDto.fromJson(json['liabilities']),
      equity: BalanceSheetSectionDto.fromJson(json['equity']),
      netIncome: (json['netIncome'] as num).toDouble(),
      balanced: (json['isBalanced'] ?? json['balanced']) as bool,
      actualBankBalance: json['actualBankBalance'] != null ? (json['actualBankBalance'] as num).toDouble() : null,
    );
  }
}
