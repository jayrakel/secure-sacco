class PermissionDto {
  final String id;
  final String code;
  final String description;

  PermissionDto({
    required this.id,
    required this.code,
    required this.description,
  });

  factory PermissionDto.fromJson(Map<String, dynamic> json) {
    return PermissionDto(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      description: json['description'] ?? '',
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PermissionDto && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

class RoleDto {
  final String id;
  final String name;
  final String description;
  final List<PermissionDto> permissions;

  RoleDto({
    required this.id,
    required this.name,
    required this.description,
    this.permissions = const [],
  });

  factory RoleDto.fromJson(Map<String, dynamic> json) {
    var permissionsList = json['permissions'] as List? ?? [];
    List<PermissionDto> items = permissionsList.map((i) => PermissionDto.fromJson(i)).toList();

    return RoleDto(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      permissions: items,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RoleDto && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

class CreateRoleRequestDto {
  final String name;
  final String? description;
  final List<String> permissionIds;

  CreateRoleRequestDto({
    required this.name,
    this.description,
    this.permissionIds = const [],
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      if (description != null && description!.isNotEmpty) 'description': description,
      'permissionIds': permissionIds,
    };
  }
}
