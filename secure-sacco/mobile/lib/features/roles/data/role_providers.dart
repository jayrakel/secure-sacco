import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:betterlink_connect/core/networking/api_client.dart';
import 'package:betterlink_connect/features/roles/data/role_dto.dart';
import 'package:betterlink_connect/features/roles/data/role_repository.dart';

final roleRepositoryProvider = Provider<RoleRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return RoleRepository(dio);
});

final rolesProvider = FutureProvider.autoDispose<List<RoleDto>>((ref) async {
  final repository = ref.watch(roleRepositoryProvider);
  return repository.getAllRoles();
});

final permissionsProvider = FutureProvider.autoDispose<List<PermissionDto>>((ref) async {
  final repository = ref.watch(roleRepositoryProvider);
  return repository.getAllPermissions();
});



class RolesNotifier extends AsyncNotifier<void> {
  RoleRepository get _repository => ref.read(roleRepositoryProvider);

  @override
  Future<void> build() async {}

  Future<void> createRole(CreateRoleRequestDto request) async {
    state = const AsyncValue.loading();
    try {
      await _repository.createRole(request);
      ref.invalidate(rolesProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> updateRolePermissions(String roleId, List<String> permissionIds) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateRolePermissions(roleId, permissionIds);
      ref.invalidate(rolesProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> syncAllDeputies(List<RoleDto> roles) async {
    state = const AsyncValue.loading();
    try {
      final syncMap = {
        'CHAIRPERSON': 'DEPUTY_CHAIRPERSON',
        'SECRETARY': 'DEPUTY_SECRETARY',
        'TREASURER': 'DEPUTY_TREASURER',
        'ACCOUNTANT': 'DEPUTY_ACCOUNTANT',
        'CASHIER': 'DEPUTY_CASHIER',
        'LOAN_OFFICER': 'DEPUTY_LOAN_OFFICER',
      };
      
      for (final principalName in syncMap.keys) {
        final deputyName = syncMap[principalName];
        try {
          final principal = roles.firstWhere((r) => r.name == principalName);
          final deputy = roles.firstWhere((r) => r.name == deputyName);
          final principalPermIds = principal.permissions.map((p) => p.id).toList();
          await _repository.updateRolePermissions(deputy.id, principalPermIds);
        } catch (_) {}
      }
      ref.invalidate(rolesProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final rolesNotifierProvider = AsyncNotifierProvider<RolesNotifier, void>(() {
  return RolesNotifier();
});
