class UserDto {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String? officialEmail;
  final String? phoneNumber;
  final String status;
  final List<String> roles;
  final String? profilePhotoUrl;

  UserDto({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.officialEmail,
    this.phoneNumber,
    required this.status,
    required this.roles,
    this.profilePhotoUrl,
  });

  factory UserDto.fromJson(Map<String, dynamic> json) {
    return UserDto(
      id: json['id'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      email: json['email'] as String,
      officialEmail: json['officialEmail'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      status: json['status'] as String,
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      profilePhotoUrl: json['profilePhotoUrl'] as String?,
    );
  }
}

class CreateUserRequestDto {
  final String firstName;
  final String lastName;
  final String email;
  final String? officialEmail;
  final String? phoneNumber;
  final String password;
  final List<String> roleIds;

  CreateUserRequestDto({
    required this.firstName,
    required this.lastName,
    required this.email,
    this.officialEmail,
    this.phoneNumber,
    required this.password,
    required this.roleIds,
  });

  Map<String, dynamic> toJson() {
    return {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      if (officialEmail != null && officialEmail!.isNotEmpty) 'officialEmail': officialEmail,
      if (phoneNumber != null && phoneNumber!.isNotEmpty) 'phoneNumber': phoneNumber,
      'password': password,
      'roleIds': roleIds,
    };
  }
}
