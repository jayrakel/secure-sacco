// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SaccoProfile _$SaccoProfileFromJson(Map<String, dynamic> json) => SaccoProfile(
  saccoName: json['saccoName'] as String?,
  tagline: json['tagline'] as String?,
  history: json['history'] as String?,
  mission: json['mission'] as String?,
  vision: json['vision'] as String?,
  foundedYear: (json['foundedYear'] as num?)?.toInt(),
  logoUrl: json['logoUrl'] as String?,
  contactPhone: json['contactPhone'] as String?,
  contactEmail: json['contactEmail'] as String?,
  contactAddress: json['contactAddress'] as String?,
);

Map<String, dynamic> _$SaccoProfileToJson(SaccoProfile instance) =>
    <String, dynamic>{
      'saccoName': instance.saccoName,
      'tagline': instance.tagline,
      'history': instance.history,
      'mission': instance.mission,
      'vision': instance.vision,
      'foundedYear': instance.foundedYear,
      'logoUrl': instance.logoUrl,
      'contactPhone': instance.contactPhone,
      'contactEmail': instance.contactEmail,
      'contactAddress': instance.contactAddress,
    };

PublicAnnouncement _$PublicAnnouncementFromJson(Map<String, dynamic> json) =>
    PublicAnnouncement(
      id: json['id'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      isPinned: json['isPinned'] as bool,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$PublicAnnouncementToJson(PublicAnnouncement instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'body': instance.body,
      'isPinned': instance.isPinned,
      'createdAt': instance.createdAt,
    };

PublicDocument _$PublicDocumentFromJson(Map<String, dynamic> json) =>
    PublicDocument(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      fileUrl: json['fileUrl'] as String,
      fileName: json['fileName'] as String,
      meetingDate: json['meetingDate'] as String?,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$PublicDocumentToJson(PublicDocument instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'description': instance.description,
      'category': instance.category,
      'fileUrl': instance.fileUrl,
      'fileName': instance.fileName,
      'meetingDate': instance.meetingDate,
      'createdAt': instance.createdAt,
    };

UpcomingMeeting _$UpcomingMeetingFromJson(Map<String, dynamic> json) =>
    UpcomingMeeting(
      id: json['id'] as String,
      title: json['title'] as String,
      meetingType: json['meetingType'] as String,
      startAt: json['startAt'] as String,
      endAt: json['endAt'] as String?,
      description: json['description'] as String,
    );

Map<String, dynamic> _$UpcomingMeetingToJson(UpcomingMeeting instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'meetingType': instance.meetingType,
      'startAt': instance.startAt,
      'endAt': instance.endAt,
      'description': instance.description,
    };

MemberSpotlight _$MemberSpotlightFromJson(Map<String, dynamic> json) =>
    MemberSpotlight(
      id: json['id'] as String,
      userId: json['userId'] as String?,
      displayName: json['displayName'] as String,
      roleTitle: json['roleTitle'] as String,
      photoUrl: json['photoUrl'] as String,
      displayOrder: (json['displayOrder'] as num).toInt(),
      isPublished: json['isPublished'] as bool,
    );

Map<String, dynamic> _$MemberSpotlightToJson(MemberSpotlight instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'displayName': instance.displayName,
      'roleTitle': instance.roleTitle,
      'photoUrl': instance.photoUrl,
      'displayOrder': instance.displayOrder,
      'isPublished': instance.isPublished,
    };

LandingPageData _$LandingPageDataFromJson(Map<String, dynamic> json) =>
    LandingPageData(
      profile: json['profile'] == null
          ? null
          : SaccoProfile.fromJson(json['profile'] as Map<String, dynamic>),
      announcements: (json['announcements'] as List<dynamic>)
          .map((e) => PublicAnnouncement.fromJson(e as Map<String, dynamic>))
          .toList(),
      documents: (json['documents'] as List<dynamic>)
          .map((e) => PublicDocument.fromJson(e as Map<String, dynamic>))
          .toList(),
      upcomingMeetings: (json['upcomingMeetings'] as List<dynamic>)
          .map((e) => UpcomingMeeting.fromJson(e as Map<String, dynamic>))
          .toList(),
      memberSpotlights: (json['memberSpotlights'] as List<dynamic>)
          .map((e) => MemberSpotlight.fromJson(e as Map<String, dynamic>))
          .toList(),
      memberCount: (json['memberCount'] as num).toInt(),
      meetingsHeld: (json['meetingsHeld'] as num).toInt(),
      totalDocuments: (json['totalDocuments'] as num).toInt(),
    );

Map<String, dynamic> _$LandingPageDataToJson(LandingPageData instance) =>
    <String, dynamic>{
      'profile': instance.profile,
      'announcements': instance.announcements,
      'documents': instance.documents,
      'upcomingMeetings': instance.upcomingMeetings,
      'memberSpotlights': instance.memberSpotlights,
      'memberCount': instance.memberCount,
      'meetingsHeld': instance.meetingsHeld,
      'totalDocuments': instance.totalDocuments,
    };

PaymentRouteInfo _$PaymentRouteInfoFromJson(Map<String, dynamic> json) =>
    PaymentRouteInfo(
      id: json['id'] as String,
      amount: (json['amount'] as num).toDouble(),
      productName: json['productName'] as String,
      accountId: json['accountId'] as String?,
    );

Map<String, dynamic> _$PaymentRouteInfoToJson(PaymentRouteInfo instance) =>
    <String, dynamic>{
      'id': instance.id,
      'amount': instance.amount,
      'productName': instance.productName,
      'accountId': instance.accountId,
    };

PaymentRouteLookupResponse _$PaymentRouteLookupResponseFromJson(
  Map<String, dynamic> json,
) => PaymentRouteLookupResponse(
  id: json['id'] as String,
  totalAmount: (json['totalAmount'] as num).toDouble(),
  paymentStatus: json['paymentStatus'] as String,
  mpesaRef: json['mpesaRef'] as String?,
  internalRef: json['internalRef'] as String?,
  memberName: json['memberName'] as String,
  memberNumber: json['memberNumber'] as String?,
  isSplitDeposit: json['isSplitDeposit'] as bool,
  routes: (json['routes'] as List<dynamic>?)
      ?.map((e) => PaymentRouteInfo.fromJson(e as Map<String, dynamic>))
      .toList(),
  createdAt: json['createdAt'] as String,
);

Map<String, dynamic> _$PaymentRouteLookupResponseToJson(
  PaymentRouteLookupResponse instance,
) => <String, dynamic>{
  'id': instance.id,
  'totalAmount': instance.totalAmount,
  'paymentStatus': instance.paymentStatus,
  'mpesaRef': instance.mpesaRef,
  'internalRef': instance.internalRef,
  'memberName': instance.memberName,
  'memberNumber': instance.memberNumber,
  'isSplitDeposit': instance.isSplitDeposit,
  'routes': instance.routes,
  'createdAt': instance.createdAt,
};
