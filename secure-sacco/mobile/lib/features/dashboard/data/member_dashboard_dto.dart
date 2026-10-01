class MemberDashboardDto {
  final String? memberName;
  final String? memberNumber;
  final String? memberStatus;
  final String? registrationStatus;
  
  final double savingsBalance;
  final double totalDeposited;
  final double totalWithdrawn;
  
  final int activeLoans;
  final double loanOutstanding;
  
  final double? nextInstallmentAmount;
  final String? nextInstallmentDueDate;
  
  final int openPenaltiesCount;
  final double openPenaltiesAmount;
  
  final int upcomingMeetings;
  final String? upcomingMeetingId;
  final String? upcomingMeetingTitle;
  final String? upcomingMeetingStartAt;
  final String? upcomingMeetingStatus;
  
  final int attendanceRate;

  MemberDashboardDto({
    this.memberName,
    this.memberNumber,
    this.memberStatus,
    this.registrationStatus,
    this.savingsBalance = 0.0,
    this.totalDeposited = 0.0,
    this.totalWithdrawn = 0.0,
    this.activeLoans = 0,
    this.loanOutstanding = 0.0,
    this.nextInstallmentAmount,
    this.nextInstallmentDueDate,
    this.openPenaltiesCount = 0,
    this.openPenaltiesAmount = 0.0,
    this.upcomingMeetings = 0,
    this.upcomingMeetingId,
    this.upcomingMeetingTitle,
    this.upcomingMeetingStartAt,
    this.upcomingMeetingStatus,
    this.attendanceRate = 0,
  });

  factory MemberDashboardDto.fromJson(Map<String, dynamic> json) {
    return MemberDashboardDto(
      memberName: json['memberName'],
      memberNumber: json['memberNumber'],
      memberStatus: json['memberStatus'],
      registrationStatus: json['registrationStatus'],
      savingsBalance: (json['savingsBalance'] ?? 0).toDouble(),
      totalDeposited: (json['totalDeposited'] ?? 0).toDouble(),
      totalWithdrawn: (json['totalWithdrawn'] ?? 0).toDouble(),
      activeLoans: json['activeLoans'] ?? 0,
      loanOutstanding: (json['loanOutstanding'] ?? 0).toDouble(),
      nextInstallmentAmount: json['nextInstallmentAmount']?.toDouble(),
      nextInstallmentDueDate: json['nextInstallmentDueDate'],
      openPenaltiesCount: json['openPenaltiesCount'] ?? 0,
      openPenaltiesAmount: (json['openPenaltiesAmount'] ?? 0).toDouble(),
      upcomingMeetings: json['upcomingMeetings'] ?? 0,
      upcomingMeetingId: json['upcomingMeetingId'],
      upcomingMeetingTitle: json['upcomingMeetingTitle'],
      upcomingMeetingStartAt: json['upcomingMeetingStartAt'],
      upcomingMeetingStatus: json['upcomingMeetingStatus'],
      attendanceRate: json['attendanceRate'] ?? 0,
    );
  }
}
