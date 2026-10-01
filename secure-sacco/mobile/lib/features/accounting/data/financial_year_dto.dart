class FinancialYearResponseDto {
  final String id;
  final String yearName;
  final String startDate;
  final String endDate;
  final String status;
  final bool isCurrent;

  FinancialYearResponseDto({
    required this.id,
    required this.yearName,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.isCurrent,
  });

  factory FinancialYearResponseDto.fromJson(Map<String, dynamic> json) {
    return FinancialYearResponseDto(
      id: json['id'] as String,
      yearName: json['yearName'] as String,
      startDate: json['startDate'] as String,
      endDate: json['endDate'] as String,
      status: json['status'] as String,
      isCurrent: json['isCurrent'] as bool,
    );
  }
}

class CreateFinancialYearRequestDto {
  final String yearName;
  final String startDate;
  final String endDate;

  CreateFinancialYearRequestDto({
    required this.yearName,
    required this.startDate,
    required this.endDate,
  });

  Map<String, dynamic> toJson() {
    return {
      'yearName': yearName,
      'startDate': startDate,
      'endDate': endDate,
    };
  }
}
