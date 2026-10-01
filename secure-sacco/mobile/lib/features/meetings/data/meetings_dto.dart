class Meeting {
  final String id;
  final String title;
  final String? description;
  final String meetingType;
  final String startAt;
  final String? endAt;
  final int lateAfterMinutes;
  final String status;
  final String? createdAt;
  final String? qrToken;

  Meeting({
    required this.id,
    required this.title,
    this.description,
    required this.meetingType,
    required this.startAt,
    this.endAt,
    required this.lateAfterMinutes,
    required this.status,
    this.createdAt,
    this.qrToken,
  });

  factory Meeting.fromJson(Map<String, dynamic> json) {
    return Meeting(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      meetingType: json['meetingType'],
      startAt: json['startAt'],
      endAt: json['endAt'],
      lateAfterMinutes: json['lateAfterMinutes'] ?? 15,
      status: json['status'],
      createdAt: json['createdAt'],
      qrToken: json['qrToken'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'meetingType': meetingType,
      'startAt': startAt,
      'endAt': endAt,
      'lateAfterMinutes': lateAfterMinutes,
      'status': status,
      'createdAt': createdAt,
      'qrToken': qrToken,
    };
  }
}

class AttendanceRecord {
  final String id;
  final String meetingId;
  final String memberId;
  final String memberName;
  final String memberNumber;
  final String status;
  final String recordedAt;
  final String? arrivedAt;

  AttendanceRecord({
    required this.id,
    required this.meetingId,
    required this.memberId,
    required this.memberName,
    required this.memberNumber,
    required this.status,
    required this.recordedAt,
    this.arrivedAt,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'],
      meetingId: json['meetingId'],
      memberId: json['memberId'],
      memberName: json['memberName'],
      memberNumber: json['memberNumber'],
      status: json['status'],
      recordedAt: json['recordedAt'],
      arrivedAt: json['arrivedAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'meetingId': meetingId,
      'memberId': memberId,
      'memberName': memberName,
      'memberNumber': memberNumber,
      'status': status,
      'recordedAt': recordedAt,
      'arrivedAt': arrivedAt,
    };
  }
}

class MyMeetingSummary {
  final String meetingId;
  final String meetingTitle;
  final String startAt;
  final String? myStatus;
  final String meetingStatus;

  MyMeetingSummary({
    required this.meetingId,
    required this.meetingTitle,
    required this.startAt,
    this.myStatus,
    required this.meetingStatus,
  });

  factory MyMeetingSummary.fromJson(Map<String, dynamic> json) {
    return MyMeetingSummary(
      meetingId: json['meetingId'],
      meetingTitle: json['meetingTitle'],
      startAt: json['startAt'],
      myStatus: json['myStatus'],
      meetingStatus: json['meetingStatus'],
    );
  }
}

class MeetingInfo {
  final String meetingId;
  final String title;
  final String description;
  final String meetingType;
  final String startAt;
  final String? endAt;
  final String status;
  final int lateAfterMinutes;
  final String qrToken;

  MeetingInfo({
    required this.meetingId,
    required this.title,
    required this.description,
    required this.meetingType,
    required this.startAt,
    this.endAt,
    required this.status,
    required this.lateAfterMinutes,
    required this.qrToken,
  });

  factory MeetingInfo.fromJson(Map<String, dynamic> json) {
    return MeetingInfo(
      meetingId: json['meetingId'],
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      meetingType: json['meetingType'] ?? '',
      startAt: json['startAt'] ?? '',
      endAt: json['endAt'],
      status: json['status'] ?? '',
      lateAfterMinutes: json['lateAfterMinutes'] ?? 15,
      qrToken: json['qrToken'] ?? '',
    );
  }
}

class CheckInResult {
  final String status;
  final String memberName;
  final String arrivedAt;

  CheckInResult({
    required this.status,
    required this.memberName,
    required this.arrivedAt,
  });

  factory CheckInResult.fromJson(Map<String, dynamic> json) {
    return CheckInResult(
      status: json['status'],
      memberName: json['memberName'],
      arrivedAt: json['arrivedAt'],
    );
  }
}
