class MemberDto {
  final String id;
  final String memberNumber;
  final String firstName;
  final String? middleName;
  final String lastName;
  final String? nationalId;
  final String phoneNumber;
  final String email;
  final String? dateOfBirth;
  final String? gender;
  final String status;
  final String? profilePhotoUrl;
  final String? createdAt;
  final String? updatedAt;

  MemberDto({
    required this.id,
    required this.memberNumber,
    required this.firstName,
    this.middleName,
    required this.lastName,
    this.nationalId,
    required this.phoneNumber,
    required this.email,
    this.dateOfBirth,
    this.gender,
    required this.status,
    this.profilePhotoUrl,
    this.createdAt,
    this.updatedAt,
  });

  factory MemberDto.fromJson(Map<String, dynamic> json) {
    return MemberDto(
      id: json['id'] ?? '',
      memberNumber: json['memberNumber'] ?? '',
      firstName: json['firstName'] ?? '',
      middleName: json['middleName'],
      lastName: json['lastName'] ?? '',
      nationalId: json['nationalId'],
      phoneNumber: json['phoneNumber'] ?? '',
      email: json['email'] ?? '',
      dateOfBirth: json['dateOfBirth'],
      gender: json['gender'],
      status: json['status'] ?? 'UNKNOWN',
      profilePhotoUrl: json['profilePhotoUrl'],
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
    );
  }

  String get fullName {
    final parts = [firstName, middleName, lastName].where((s) => s != null && s.isNotEmpty).toList();
    return parts.join(' ');
  }
}

class PaginatedMemberResponse {
  final List<MemberDto> content;
  final int totalPages;
  final int totalElements;
  final bool last;
  final int size;
  final int number;

  PaginatedMemberResponse({
    required this.content,
    required this.totalPages,
    required this.totalElements,
    required this.last,
    required this.size,
    required this.number,
  });

  factory PaginatedMemberResponse.fromJson(Map<String, dynamic> json) {
    var contentList = json['content'] as List? ?? [];
    List<MemberDto> items = contentList.map((i) => MemberDto.fromJson(i)).toList();

    return PaginatedMemberResponse(
      content: items,
      totalPages: json['totalPages'] ?? 0,
      totalElements: json['totalElements'] ?? 0,
      last: json['last'] ?? true,
      size: json['size'] ?? 10,
      number: json['number'] ?? 0,
    );
  }
}

class CreateMemberRequestDto {
  final String firstName;
  final String? middleName;
  final String lastName;
  final String? nationalId;
  final String phoneNumber;
  final String email;
  final String? dateOfBirth;
  final String? gender;

  CreateMemberRequestDto({
    required this.firstName,
    this.middleName,
    required this.lastName,
    this.nationalId,
    required this.phoneNumber,
    required this.email,
    this.dateOfBirth,
    this.gender,
  });

  Map<String, dynamic> toJson() {
    return {
      'firstName': firstName,
      if (middleName != null && middleName!.isNotEmpty) 'middleName': middleName,
      'lastName': lastName,
      if (nationalId != null && nationalId!.isNotEmpty) 'nationalId': nationalId,
      'phoneNumber': phoneNumber,
      'email': email,
      if (dateOfBirth != null && dateOfBirth!.isNotEmpty) 'dateOfBirth': dateOfBirth,
      if (gender != null && gender!.isNotEmpty) 'gender': gender,
    };
  }
}
