import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'role_dto.dart';
import 'role_repository.dart';
import 'user_dto.dart';
import 'user_repository.dart';

final roleListProvider = FutureProvider.autoDispose<List<RoleDto>>((ref) async {
  final repository = ref.watch(roleRepositoryProvider);
  return repository.getRoles();
});

final userListProvider = FutureProvider.autoDispose<List<UserDto>>((ref) async {
  final repository = ref.watch(userRepositoryProvider);
  return repository.getUsers();
});

final userDetailProvider = FutureProvider.autoDispose.family<UserDto, String>((ref, id) async {
  final repository = ref.watch(userRepositoryProvider);
  return repository.getUser(id);
});
