import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:betterlink_connect/core/theme/app_colors.dart';
import 'package:betterlink_connect/core/theme/app_text_styles.dart';
import 'package:betterlink_connect/features/roles/data/role_dto.dart';
import 'package:betterlink_connect/features/roles/data/role_providers.dart';
import 'package:betterlink_connect/features/roles/presentation/admin/create_role_dialog.dart';
import 'package:go_router/go_router.dart';
class PermMeta {
  final String label;
  final String desc;
  final String group;
  final IconData groupIcon;
  final Color groupColor;

  const PermMeta(this.label, this.desc, this.group, this.groupIcon, this.groupColor);
}

const Map<String, PermMeta> permMetaData = {
  'MEMBERS_READ': PermMeta('View Members', 'Browse member directory', 'Members', Icons.people, Colors.blue),
  'MEMBERS_WRITE': PermMeta('Create & Edit Members', 'Register new members', 'Members', Icons.people, Colors.blue),
  'MEMBER_STATUS_CHANGE': PermMeta('Change Member Status', 'Suspend or reactivate', 'Members', Icons.people, Colors.blue),
  
  'USER_READ': PermMeta('View Users', 'Access user accounts list', 'Users', Icons.person_search, Colors.indigo),
  'USER_CREATE': PermMeta('Create Users', 'Create new login accounts', 'Users', Icons.person_add, Colors.indigo),
  'USER_UPDATE': PermMeta('Edit Users', 'Update account details', 'Users', Icons.manage_accounts, Colors.indigo),

  'ROLE_READ': PermMeta('View Roles', 'Access Roles & Permissions', 'Roles', Icons.admin_panel_settings, Colors.deepPurple),
  'ROLE_CREATE': PermMeta('Create Roles', 'Define new security roles', 'Roles', Icons.security, Colors.deepPurple),
  'ROLE_UPDATE': PermMeta('Edit Role Permissions', 'Assign and remove permissions', 'Roles', Icons.vpn_key, Colors.deepPurple),

  'LOANS_READ': PermMeta('View Loans', 'View loan applications', 'Loans', Icons.monetization_on, Colors.amber),
  'LOANS_APPROVE': PermMeta('Verify Loans', 'First-level verification', 'Loans', Icons.verified, Colors.amber),
  'LOANS_DISBURSE': PermMeta('Disburse Loans', 'Disburse funds', 'Loans', Icons.send_to_mobile, Colors.amber),

  'SAVINGS_READ': PermMeta('View Savings', 'View savings and transactions', 'Savings', Icons.savings, Colors.teal),
  'SAVINGS_MANUAL_POST': PermMeta('Post Manual Transactions', 'Record cash deposits', 'Savings', Icons.point_of_sale, Colors.teal),
  
  'REPORTS_READ': PermMeta('View Reports', 'Access financial reports', 'Reports', Icons.bar_chart, Colors.pink),
  'ACCOUNTING_READ': PermMeta('View Accounting', 'View chart of accounts', 'Accounting', Icons.account_balance, Colors.lightBlue),
  'ACCOUNTING_WRITE': PermMeta('Manage Accounts', 'Create and edit GL accounts', 'Accounting', Icons.edit_note, Colors.lightBlue),
};

class RolesManagementScreen extends ConsumerStatefulWidget {
  const RolesManagementScreen({super.key});

  @override
  ConsumerState<RolesManagementScreen> createState() => _RolesManagementScreenState();
}

class _RolesManagementScreenState extends ConsumerState<RolesManagementScreen> {
  RoleDto? _selectedRole;
  Set<String> _editedPermIds = {};

  void _selectRole(RoleDto role) {
    setState(() {
      _selectedRole = role;
      _editedPermIds = role.permissions.map((p) => p.id).toSet();
    });
  }

  void _togglePerm(String permId) {
    if (_selectedRole?.name == 'SYSTEM_ADMIN') return;
    setState(() {
      if (_editedPermIds.contains(permId)) {
        _editedPermIds.remove(permId);
      } else {
        _editedPermIds.add(permId);
      }
    });
  }

  static const Map<String, String> _deputySync = {
    'CHAIRPERSON': 'DEPUTY_CHAIRPERSON',
    'TREASURER': 'DEPUTY_TREASURER',
    'SECRETARY': 'DEPUTY_SECRETARY',
    'ACCOUNTANT': 'DEPUTY_ACCOUNTANT',
    'CASHIER': 'DEPUTY_CASHIER',
    'LOAN_OFFICER': 'DEPUTY_LOAN_OFFICER',
  };

  Future<void> _save() async {
    if (_selectedRole == null) return;
    try {
      final permIds = _editedPermIds.toList();
      
      // 1. Save the principal role
      await ref.read(rolesNotifierProvider.notifier).updateRolePermissions(
        _selectedRole!.id, 
        permIds,
      );
      
      // 2. Auto-sync deputy if this is a principal role
      final deputyName = _deputySync[_selectedRole!.name];
      bool deputySynced = false;
      if (deputyName != null) {
        final roles = ref.read(rolesProvider).value ?? [];
        try {
          final deputyRole = roles.firstWhere((r) => r.name == deputyName);
          await ref.read(rolesNotifierProvider.notifier).updateRolePermissions(
            deputyRole.id, 
            permIds,
          );
          deputySynced = true;
        } catch (_) {
          // Deputy role not found, do nothing
        }
      }

      if (mounted) {
        final msg = deputySynced
            ? 'Permissions saved and ${deputyName!.replaceAll('_', ' ')} automatically synced.'
            : 'Permissions saved successfully';
            
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save permissions: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final rolesAsync = ref.watch(rolesProvider);
    final permsAsync = ref.watch(permissionsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/staff-dashboard');
            }
          },
        ),
        title: const Text('Roles & Permissions', style: AppTextStyles.h3),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: TextButton.icon(
              onPressed: () => showDialog(
                context: context, 
                builder: (_) => const CreateRoleDialog(),
              ),
              icon: const Icon(Icons.add, color: AppColors.primary),
              label: const Text('New Role', style: TextStyle(color: AppColors.primary)),
            ),
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(rolesProvider);
          ref.invalidate(permissionsProvider);
          try {
            await ref.read(rolesProvider.future);
            await ref.read(permissionsProvider.future);
          } catch (_) {}
        },
        child: rolesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
        data: (roles) {
          if (roles.isNotEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (_selectedRole == null) {
                _selectRole(roles.first);
              } else {
                final currentId = _selectedRole!.id;
                final updatedRole = roles.firstWhere((r) => r.id == currentId, orElse: () => roles.first);
                if (_selectedRole != updatedRole) {
                  _selectRole(updatedRole);
                }
              }
            });
          }
          
          final dropdownValue = _selectedRole != null && roles.any((r) => r.id == _selectedRole!.id)
              ? roles.firstWhere((r) => r.id == _selectedRole!.id)
              : null;

          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(bottom: BorderSide(color: AppColors.border)),
                  ),
                  child: DropdownButtonFormField<RoleDto>(
                    value: dropdownValue,
                    decoration: const InputDecoration(
                      labelText: 'Select Role to Edit',
                      border: OutlineInputBorder(),
                    ),
                    items: roles.map((role) {
                      final isAdmin = role.name == 'SYSTEM_ADMIN';
                      return DropdownMenuItem<RoleDto>(
                        value: role,
                        child: Row(
                          children: [
                            Icon(
                              isAdmin ? Icons.lock : Icons.shield, 
                              color: isAdmin ? Colors.red : AppColors.primary,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(role.name.replaceAll('_', ' ')),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (role) {
                      if (role != null) _selectRole(role);
                    },
                  ),
                ),
              ),
              
              // Permissions Editor
              if (_selectedRole == null)
                const SliverFillRemaining(
                  child: Center(child: Text('Select a role to configure permissions.')),
                )
              else
                permsAsync.when(
                  loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
                  error: (err, _) => SliverFillRemaining(child: Center(child: Text('Error: $err'))),
                  data: (allPerms) {
                    // Group permissions
                    final grouped = <String, List<PermissionDto>>{};
                    final unknown = <PermissionDto>[];
                    
                    for (var p in allPerms) {
                      final meta = permMetaData[p.code];
                      if (meta != null) {
                        grouped.putIfAbsent(meta.group, () => []).add(p);
                      } else {
                        unknown.add(p);
                      }
                    }
                    
                    final isAdmin = _selectedRole?.name == 'SYSTEM_ADMIN';
                    final originalPermIds = _selectedRole!.permissions.map((p) => p.id).toSet();
                    final hasChanges = _editedPermIds.length != originalPermIds.length || 
                                       !_editedPermIds.containsAll(originalPermIds);

                    return SliverToBoxAdapter(
                      child: Column(
                        children: [
                          // Header
                          Container(
                            color: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _selectedRole!.name.replaceAll('_', ' '),
                                        style: AppTextStyles.h2,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${_editedPermIds.length} permissions active',
                                        style: AppTextStyles.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                if (isAdmin)
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    alignment: WrapAlignment.end,
                                    children: [
                                      TextButton.icon(
                                        onPressed: () async {
                                          final roles = ref.read(rolesProvider).value;
                                          if (roles != null) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(content: Text('Syncing all deputies...')),
                                            );
                                            await ref.read(rolesNotifierProvider.notifier).syncAllDeputies(roles);
                                            if (context.mounted) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(content: Text('All deputies synced successfully!')),
                                              );
                                            }
                                          }
                                        },
                                        icon: const Icon(Icons.sync, size: 16),
                                        label: const Text('Sync Deputies'),
                                        style: TextButton.styleFrom(
                                          foregroundColor: AppColors.primary,
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      ElevatedButton.icon(
                                        onPressed: () {
                                          showDialog(
                                            context: context, 
                                            builder: (_) => const CreateRoleDialog(),
                                          );
                                        },
                                        icon: const Icon(Icons.add, size: 16),
                                        label: const Text('New Role'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.primary,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  )
                                else
                                  ElevatedButton.icon(
                                    onPressed: (!hasChanges || isAdmin) ? null : _save,
                                    icon: const Icon(Icons.save),
                                    label: const Text('Save Changes'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const Divider(height: 1, color: AppColors.border),
                          
                          if (isAdmin)
                            Container(
                              padding: const EdgeInsets.all(16),
                              margin: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                border: Border.all(color: Colors.red.shade200),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.warning, color: Colors.red.shade700),
                                  const SizedBox(width: 12),
                                  const Expanded(
                                    child: Text(
                                      'SYSTEM_ADMIN has implicit access to everything and cannot be restricted.',
                                      style: TextStyle(color: Colors.red),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          
                          Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                for (final entry in grouped.entries) ...[
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 8.0, top: 16.0),
                                    child: Row(
                                      children: [
                                        Icon(
                                          permMetaData.values.firstWhere((m) => m.group == entry.key).groupIcon,
                                          size: 18,
                                          color: permMetaData.values.firstWhere((m) => m.group == entry.key).groupColor,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          entry.key,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                      ],
                                    ),
                                  ),
                                  GridView.builder(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                                      maxCrossAxisExtent: 350,
                                      mainAxisExtent: 100,
                                      crossAxisSpacing: 16,
                                      mainAxisSpacing: 16,
                                    ),
                                    itemCount: entry.value.length,
                                    itemBuilder: (context, idx) {
                                      final p = entry.value[idx];
                                      final meta = permMetaData[p.code];
                                      final isOn = _editedPermIds.contains(p.id);
                                      
                                      return _buildPermCard(
                                        p: p,
                                        isOn: isOn,
                                        isAdmin: isAdmin,
                                        label: meta?.label ?? p.code,
                                        desc: meta?.desc ?? p.description,
                                        color: meta?.groupColor ?? Colors.grey,
                                      );
                                    },
                                  ),
                                ],
                                if (unknown.isNotEmpty) ...[
                                  const Padding(
                                    padding: EdgeInsets.only(bottom: 8.0, top: 24.0),
                                    child: Row(
                                      children: [
                                        Icon(Icons.settings, size: 18, color: Colors.grey),
                                        SizedBox(width: 8),
                                        Text('Other', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                      ],
                                    ),
                                  ),
                                  GridView.builder(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                                      maxCrossAxisExtent: 350,
                                      mainAxisExtent: 100,
                                      crossAxisSpacing: 16,
                                      mainAxisSpacing: 16,
                                    ),
                                    itemCount: unknown.length,
                                    itemBuilder: (context, idx) {
                                      final p = unknown[idx];
                                      final isOn = _editedPermIds.contains(p.id);
                                      
                                      return _buildPermCard(
                                        p: p,
                                        isOn: isOn,
                                        isAdmin: isAdmin,
                                        label: p.code,
                                        desc: p.description,
                                        color: Colors.grey,
                                      );
                                    },
                                  ),
                                ]
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                )
            ],
          );
        },
      ),
      ),
    );
  }

  Widget _buildPermCard({
    required PermissionDto p,
    required bool isOn,
    required bool isAdmin,
    required String label,
    required String desc,
    required Color color,
  }) {
    return InkWell(
      onTap: isAdmin ? null : () => _togglePerm(p.id),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isOn ? color.withOpacity(0.05) : Colors.white,
          border: Border.all(color: isOn ? color.withOpacity(0.3) : AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Switch(
              value: isOn,
              onChanged: isAdmin ? null : (_) => _togglePerm(p.id),
              activeColor: color,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: isOn ? color.withOpacity(0.8) : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    desc,
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}
