import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/user_providers.dart';
import '../data/user_repository.dart';
import '../data/user_dto.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';

class UserDetailScreen extends ConsumerWidget {
  final String userId;
  const UserDetailScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userDetailProvider(userId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('User Details'),
      ),
      body: userAsync.when(
        data: (user) {
          return RefreshIndicator(
            onRefresh: () async {
              return ref.refresh(userDetailProvider(userId).future);
            },
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                _buildProfileHeader(user),
                const SizedBox(height: AppSpacing.md),
                _buildInfoSection('Contact Information', [
                  _buildInfoRow('Email', user.email),
                  _buildInfoRow('Official Email', user.officialEmail ?? 'N/A'),
                  _buildInfoRow('Phone', user.phoneNumber ?? 'N/A'),
                ]),
                const SizedBox(height: AppSpacing.md),
                _buildInfoSection('Assigned Roles', [
                  ...user.roles.map((r) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            const Icon(Icons.security, size: 16, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Text(r),
                          ],
                        ),
                      ))
                ]),
                const SizedBox(height: AppSpacing.lg),
                _buildActionButtons(context, ref, user),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err', style: const TextStyle(color: AppColors.negative))),
      ),
    );
  }

  Widget _buildProfileHeader(UserDto user) {
    Color statusColor;
    switch (user.status) {
      case 'ACTIVE': statusColor = AppColors.positive; break;
      case 'DISABLED':
      case 'LOCKED': statusColor = AppColors.negative; break;
      case 'PENDING_ACTIVATION': statusColor = AppColors.warning; break;
      default: statusColor = AppColors.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: AppColors.background,
            child: Text(
              user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : '?',
              style: const TextStyle(color: AppColors.primary, fontSize: 24, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${user.firstName} ${user.lastName}', style: AppTextStyles.h2),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha(30),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    user.status,
                    style: AppTextStyles.bodySmall.copyWith(color: statusColor, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTextStyles.h3),
          const SizedBox(height: AppSpacing.sm),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
          ),
          Expanded(
            child: Text(value, style: AppTextStyles.bodyMedium),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, WidgetRef ref, UserDto user) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Actions', style: AppTextStyles.h3),
          const SizedBox(height: AppSpacing.md),
          if (user.status != 'ACTIVE')
            ElevatedButton(
              onPressed: () => _showStatusConfirm(context, ref, 'ACTIVE'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.positive, minimumSize: const Size.fromHeight(48)),
              child: const Text('Activate User', style: TextStyle(color: Colors.white)),
            ),
          if (user.status != 'ACTIVE') const SizedBox(height: AppSpacing.sm),
          if (user.status != 'DISABLED')
            ElevatedButton(
              onPressed: () => _showStatusConfirm(context, ref, 'DISABLED'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.negative, minimumSize: const Size.fromHeight(48)),
              child: const Text('Disable User', style: TextStyle(color: Colors.white)),
            ),
          const SizedBox(height: AppSpacing.sm),
          ElevatedButton(
            onPressed: () => _showManageRolesDialog(context, ref, user),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, minimumSize: const Size.fromHeight(48)),
            child: const Text('Manage Roles', style: TextStyle(color: Colors.white)),
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton(
            onPressed: () => _showEditUserDialog(context, ref, user),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            child: const Text('Edit User Profile'),
          ),
        ],
      ),
    );
  }

  void _showEditUserDialog(BuildContext context, WidgetRef ref, UserDto user) {
    showDialog(
      context: context,
      builder: (ctx) => _EditUserDialog(user: user),
    );
  }

  void _showStatusConfirm(BuildContext context, WidgetRef ref, String newStatus) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Action'),
        content: Text("Are you sure you want to change this user's status to $newStatus?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final repo = ref.read(userRepositoryProvider);
                await repo.updateUserStatus(userId, newStatus);
                ref.invalidate(userDetailProvider(userId));
                ref.invalidate(userListProvider);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Status updated successfully'), backgroundColor: AppColors.positive));
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.negative));
                }
              }
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  void _showManageRolesDialog(BuildContext context, WidgetRef ref, UserDto user) {
    showDialog(
      context: context,
      builder: (ctx) => _ManageRolesDialog(user: user),
    );
  }
}

class _ManageRolesDialog extends ConsumerStatefulWidget {
  final UserDto user;
  const _ManageRolesDialog({required this.user});

  @override
  ConsumerState<_ManageRolesDialog> createState() => _ManageRolesDialogState();
}

class _ManageRolesDialogState extends ConsumerState<_ManageRolesDialog> {
  final List<String> _selectedRoleIds = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // We will initialize selected roles when the future completes, based on role names
  }

  @override
  Widget build(BuildContext context) {
    final rolesAsync = ref.watch(roleListProvider);

    return AlertDialog(
      title: const Text('Manage Roles'),
      content: rolesAsync.when(
        data: (roles) {
          if (roles.isEmpty) return const Text('No roles available');
          
          // Pre-select based on name matching, only once
          if (_selectedRoleIds.isEmpty && !_isLoading) {
             for (var role in roles) {
               if (widget.user.roles.contains(role.name)) {
                 _selectedRoleIds.add(role.id);
               }
             }
          }

          return SizedBox(
            width: double.maxFinite,
            child: ListView(
              shrinkWrap: true,
              children: roles.map((role) {
                return CheckboxListTile(
                  title: Text(role.name),
                  subtitle: role.description != null ? Text(role.description!) : null,
                  value: _selectedRoleIds.contains(role.id),
                  onChanged: (bool? checked) {
                    setState(() {
                      if (checked == true) {
                        _selectedRoleIds.add(role.id);
                      } else {
                        _selectedRoleIds.remove(role.id);
                      }
                    });
                  },
                );
              }).toList(),
            ),
          );
        },
        loading: () => const SizedBox(height: 100, child: Center(child: CircularProgressIndicator())),
        error: (err, stack) => Text('Error loading roles: $err', style: const TextStyle(color: AppColors.negative)),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _isLoading || rolesAsync.isLoading ? null : () async {
            if (_selectedRoleIds.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select at least one role'), backgroundColor: AppColors.warning));
              return;
            }
            setState(() => _isLoading = true);
            try {
              final repo = ref.read(userRepositoryProvider);
              await repo.updateUserRoles(widget.user.id, _selectedRoleIds);
              ref.invalidate(userDetailProvider(widget.user.id));
              ref.invalidate(userListProvider);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Roles updated successfully'), backgroundColor: AppColors.positive));
                Navigator.pop(context);
              }
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.negative));
              }
            } finally {
              if (mounted) setState(() => _isLoading = false);
            }
          },
          child: _isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Save'),
        ),
      ],
    );
  }
}

class _EditUserDialog extends ConsumerStatefulWidget {
  final UserDto user;
  const _EditUserDialog({required this.user});

  @override
  ConsumerState<_EditUserDialog> createState() => _EditUserDialogState();
}

class _EditUserDialogState extends ConsumerState<_EditUserDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _phoneController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(text: widget.user.firstName);
    _lastNameController = TextEditingController(text: widget.user.lastName);
    _phoneController = TextEditingController(text: widget.user.phoneNumber ?? '');
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Edit User Profile'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _firstNameController,
                decoration: const InputDecoration(labelText: 'First Name', border: OutlineInputBorder()),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _lastNameController,
                decoration: const InputDecoration(labelText: 'Last Name', border: OutlineInputBorder()),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Phone Number (Optional)', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _isLoading ? null : () async {
            if (!_formKey.currentState!.validate()) return;
            setState(() => _isLoading = true);
            try {
              final repo = ref.read(userRepositoryProvider);
              await repo.updateUser(
                widget.user.id,
                _firstNameController.text.trim(),
                _lastNameController.text.trim(),
                _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
              );
              ref.invalidate(userDetailProvider(widget.user.id));
              ref.invalidate(userListProvider);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated successfully'), backgroundColor: AppColors.positive));
                Navigator.pop(context);
              }
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.negative));
              }
            } finally {
              if (mounted) setState(() => _isLoading = false);
            }
          },
          child: _isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Save'),
        ),
      ],
    );
  }
}

