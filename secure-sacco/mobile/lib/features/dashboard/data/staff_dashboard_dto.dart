class StaffDashboardDto {
  final int totalMembers;
  final int activeMembers;
  final int pendingActivations;
  final double netWorth;
  final double totalSavings;
  final int activeLoans;
  final double loanPortfolio;
  final int loansInArrears;
  final double totalArrearsAmount;
  final int pendingLoanApplications;
  final int openPenalties;
  final double outstandingPenalties;
  final double todaysCollections;
  final int upcomingMeetings;
  final int meetingsThisMonth;

  StaffDashboardDto({
    this.totalMembers = 0,
    this.activeMembers = 0,
    this.pendingActivations = 0,
    this.netWorth = 0.0,
    this.totalSavings = 0.0,
    this.activeLoans = 0,
    this.loanPortfolio = 0.0,
    this.loansInArrears = 0,
    this.totalArrearsAmount = 0.0,
    this.pendingLoanApplications = 0,
    this.openPenalties = 0,
    this.outstandingPenalties = 0.0,
    this.todaysCollections = 0.0,
    this.upcomingMeetings = 0,
    this.meetingsThisMonth = 0,
  });

  factory StaffDashboardDto.fromJson(Map<String, dynamic> json) {
    return StaffDashboardDto(
      totalMembers: json['totalMembers'] as int? ?? 0,
      activeMembers: json['activeMembers'] as int? ?? 0,
      pendingActivations: json['pendingActivations'] as int? ?? 0,
      netWorth: (json['netWorth'] as num?)?.toDouble() ?? 0.0,
      totalSavings: (json['totalSavings'] as num?)?.toDouble() ?? 0.0,
      activeLoans: json['activeLoans'] as int? ?? 0,
      loanPortfolio: (json['loanPortfolio'] as num?)?.toDouble() ?? 0.0,
      loansInArrears: json['loansInArrears'] as int? ?? 0,
      totalArrearsAmount: (json['totalArrearsAmount'] as num?)?.toDouble() ?? 0.0,
      pendingLoanApplications: json['pendingLoanApplications'] as int? ?? 0,
      openPenalties: json['openPenalties'] as int? ?? 0,
      outstandingPenalties: (json['outstandingPenalties'] as num?)?.toDouble() ?? 0.0,
      todaysCollections: (json['todaysCollections'] as num?)?.toDouble() ?? 0.0,
      upcomingMeetings: json['upcomingMeetings'] as int? ?? 0,
      meetingsThisMonth: json['meetingsThisMonth'] as int? ?? 0,
    );
  }
}
