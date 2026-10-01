import 'package:json_annotation/json_annotation.dart';

part 'public_models.g.dart';

@JsonSerializable()
class SaccoProfile {
  final String? saccoName;
  final String? tagline;
  final String? history;
  final String? mission;
  final String? vision;
  final int? foundedYear;
  final String? logoUrl;
  final String? contactPhone;
  final String? contactEmail;
  final String? contactAddress;

  SaccoProfile({
    this.saccoName,
    this.tagline,
    this.history,
    this.mission,
    this.vision,
    this.foundedYear,
    this.logoUrl,
    this.contactPhone,
    this.contactEmail,
    this.contactAddress,
  });

  factory SaccoProfile.fromJson(Map<String, dynamic> json) => _$SaccoProfileFromJson(json);
  Map<String, dynamic> toJson() => _$SaccoProfileToJson(this);
}

@JsonSerializable()
class PublicAnnouncement {
  final String id;
  final String title;
  final String body;
  final bool isPinned;
  final String createdAt;

  PublicAnnouncement({
    required this.id,
    required this.title,
    required this.body,
    required this.isPinned,
    required this.createdAt,
  });

  factory PublicAnnouncement.fromJson(Map<String, dynamic> json) => _$PublicAnnouncementFromJson(json);
  Map<String, dynamic> toJson() => _$PublicAnnouncementToJson(this);
}

@JsonSerializable()
class PublicDocument {
  final String id;
  final String title;
  final String description;
  final String category;
  final String fileUrl;
  final String fileName;
  final String? meetingDate;
  final String createdAt;

  PublicDocument({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.fileUrl,
    required this.fileName,
    this.meetingDate,
    required this.createdAt,
  });

  factory PublicDocument.fromJson(Map<String, dynamic> json) => _$PublicDocumentFromJson(json);
  Map<String, dynamic> toJson() => _$PublicDocumentToJson(this);
}

@JsonSerializable()
class UpcomingMeeting {
  final String id;
  final String title;
  final String meetingType;
  final String startAt;
  final String? endAt;
  final String description;

  UpcomingMeeting({
    required this.id,
    required this.title,
    required this.meetingType,
    required this.startAt,
    this.endAt,
    required this.description,
  });

  factory UpcomingMeeting.fromJson(Map<String, dynamic> json) => _$UpcomingMeetingFromJson(json);
  Map<String, dynamic> toJson() => _$UpcomingMeetingToJson(this);
}

@JsonSerializable()
class MemberSpotlight {
  final String id;
  final String? userId;
  final String displayName;
  final String roleTitle;
  final String photoUrl;
  final int displayOrder;
  final bool isPublished;

  MemberSpotlight({
    required this.id,
    this.userId,
    required this.displayName,
    required this.roleTitle,
    required this.photoUrl,
    required this.displayOrder,
    required this.isPublished,
  });

  factory MemberSpotlight.fromJson(Map<String, dynamic> json) => _$MemberSpotlightFromJson(json);
  Map<String, dynamic> toJson() => _$MemberSpotlightToJson(this);
}

@JsonSerializable()
class LandingPageData {
  final SaccoProfile? profile;
  final List<PublicAnnouncement> announcements;
  final List<PublicDocument> documents;
  final List<UpcomingMeeting> upcomingMeetings;
  final List<MemberSpotlight> memberSpotlights;
  final int memberCount;
  final int meetingsHeld;
  final int totalDocuments;

  LandingPageData({
    this.profile,
    required this.announcements,
    required this.documents,
    required this.upcomingMeetings,
    required this.memberSpotlights,
    required this.memberCount,
    required this.meetingsHeld,
    required this.totalDocuments,
  });

  factory LandingPageData.fromJson(Map<String, dynamic> json) => _$LandingPageDataFromJson(json);
  Map<String, dynamic> toJson() => _$LandingPageDataToJson(this);
}

@JsonSerializable()
class PaymentRouteInfo {
  final String id;
  final double amount;
  final String productName;
  final String? accountId;

  PaymentRouteInfo({
    required this.id,
    required this.amount,
    required this.productName,
    this.accountId,
  });

  factory PaymentRouteInfo.fromJson(Map<String, dynamic> json) => _$PaymentRouteInfoFromJson(json);
  Map<String, dynamic> toJson() => _$PaymentRouteInfoToJson(this);
}

@JsonSerializable()
class PaymentRouteLookupResponse {
  final String id;
  final double totalAmount;
  final String paymentStatus;
  final String? mpesaRef;
  final String? internalRef;
  final String memberName;
  final String? memberNumber;
  final bool isSplitDeposit;
  final List<PaymentRouteInfo>? routes;
  final String createdAt;

  PaymentRouteLookupResponse({
    required this.id,
    required this.totalAmount,
    required this.paymentStatus,
    this.mpesaRef,
    this.internalRef,
    required this.memberName,
    this.memberNumber,
    required this.isSplitDeposit,
    this.routes,
    required this.createdAt,
  });

  factory PaymentRouteLookupResponse.fromJson(Map<String, dynamic> json) => _$PaymentRouteLookupResponseFromJson(json);
  Map<String, dynamic> toJson() => _$PaymentRouteLookupResponseToJson(this);
}
