class PermissionDto {
  final String id;
  final String code;
  final String? description;

  PermissionDto({
    required this.id,
    required this.code,
    this.description,
  });

  factory PermissionDto.fromJson(Map<String, dynamic> json) {
    return PermissionDto(
      id: json['id'] as String,
      code: json['code'] as String,
      description: json['description'] as String?,
    );
  }
}

class RoleDto {
  final String id;
  final String name;
  final String? description;
  final List<PermissionDto> permissions;

  RoleDto({
    required this.id,
    required this.name,
    this.description,
    required this.permissions,
  });

  factory RoleDto.fromJson(Map<String, dynamic> json) {
    var permissionsList = json['permissions'] as List? ?? [];
    List<PermissionDto> permissions = permissionsList.map((i) => PermissionDto.fromJson(i)).toList();

    return RoleDto(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      permissions: permissions,
    );
  }
}
