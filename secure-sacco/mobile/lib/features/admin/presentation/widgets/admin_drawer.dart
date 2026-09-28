import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/data/auth_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/authenticated_avatar.dart';
import '../../../auth/data/auth_state.dart';

class AdminDrawer extends ConsumerWidget {
  const AdminDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userName = 'Administrator';
    final email = '';

    return Drawer(
      backgroundColor: AppColors.surface,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              color: AppColors.primary,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                  Consumer(
                    builder: (context, ref, child) {
                      final authState = ref.watch(authControllerProvider);
                      final user = authState.user;
                      final photoUrl = user != null && user['profilePhotoUrl'] != null 
                          ? '${user['profilePhotoUrl']}?t=${DateTime.now().millisecondsSinceEpoch}' 
                          : null;
                      final initial = user != null && user['firstName'] != null && user['firstName'].isNotEmpty 
                          ? user['firstName'][0].toUpperCase() 
                          : '?';
                      return AuthenticatedAvatar(
                        radius: 30,
                        imageUrl: photoUrl,
                        fallbackText: initial,
                        backgroundColor: Colors.white,
                        textColor: AppColors.primary,
                      );
                    },
                  ),
                const SizedBox(height: 12),
                Text(
                  userName,
                  style: AppTextStyles.h3.copyWith(color: Colors.white),
                ),
                Text(
                  email,
                  style: AppTextStyles.bodySmall.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard, color: AppColors.textPrimary),
            title: const Text('Dashboard', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.go('/staff-dashboard');
            },
          ),
          ListTile(
            leading: const Icon(Icons.people, color: AppColors.textPrimary),
            title: const Text('Members', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.go('/admin/members');
            },
          ),
          ListTile(
            leading: const Icon(Icons.savings, color: AppColors.textPrimary),
            title: const Text('Savings Management', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/savings');
            },
          ),
          ListTile(
            leading: const Icon(Icons.shield_outlined, color: AppColors.textPrimary),
            title: const Text('Obligations Compliance', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/obligations/compliance');
            },
          ),
          ListTile(
            leading: const Icon(Icons.manage_accounts, color: AppColors.textPrimary),
            title: const Text('Staff & Users', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.go('/admin/users');
            },
          ),
          ListTile(
            leading: const Icon(Icons.admin_panel_settings, color: AppColors.textPrimary),
            title: const Text('Roles & Permissions', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.go('/admin/roles');
            },
          ),
          ListTile(
            leading: const Icon(Icons.settings, color: AppColors.textPrimary),
            title: const Text('System Settings', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/settings');
            },
          ),
          ExpansionTile(
            leading: const Icon(Icons.account_balance_wallet, color: AppColors.textPrimary),
            title: const Text('Finance', style: AppTextStyles.bodyMedium),
            childrenPadding: const EdgeInsets.only(left: 16),
            children: [
              ListTile(
                leading: const Icon(Icons.dashboard, size: 20, color: AppColors.textPrimary),
                title: const Text('Dashboard', style: AppTextStyles.bodySmall),
                onTap: () {
                  Navigator.pop(context);
                  context.go('/accounting');
                },
              ),
              ListTile(
                leading: const Icon(Icons.list_alt, size: 20, color: AppColors.textPrimary),
                title: const Text('Chart of Accounts', style: AppTextStyles.bodySmall),
                onTap: () {
                  Navigator.pop(context);
                  context.go('/accounting/chart-of-accounts');
                },
              ),
              ListTile(
                leading: const Icon(Icons.menu_book, size: 20, color: AppColors.textPrimary),
                title: const Text('Journal Entries', style: AppTextStyles.bodySmall),
                onTap: () {
                  Navigator.pop(context);
                  context.go('/accounting/journal-entries');
                },
              ),
              ListTile(
                leading: const Icon(Icons.receipt_long, size: 20, color: AppColors.textPrimary),
                title: const Text('Operating Expenses', style: AppTextStyles.bodySmall),
                onTap: () {
                  Navigator.pop(context);
                  context.go('/accounting/expenses');
                },
              ),
              ListTile(
                leading: const Icon(Icons.compare_arrows, size: 20, color: AppColors.textPrimary),
                title: const Text('Bank Reconciliation', style: AppTextStyles.bodySmall),
                onTap: () {
                  Navigator.pop(context);
                  context.go('/accounting/reconciliation');
                },
              ),
              ListTile(
                leading: const Icon(Icons.insights, size: 20, color: AppColors.textPrimary),
                title: const Text('Financial Reports', style: AppTextStyles.bodySmall),
                onTap: () {
                  Navigator.pop(context);
                  context.go('/accounting/reports');
                },
              ),
              ListTile(
                leading: const Icon(Icons.calendar_month, size: 20, color: AppColors.textPrimary),
                title: const Text('Financial Years', style: AppTextStyles.bodySmall),
                onTap: () {
                  Navigator.pop(context);
                  context.go('/accounting/financial-years');
                },
              ),
            ],
          ),
          ListTile(
            leading: const Icon(Icons.monetization_on, color: AppColors.textPrimary),
            title: const Text('Dividends', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/dividends');
            },
          ),
          ListTile(
            leading: const Icon(Icons.receipt, color: AppColors.textPrimary),
            title: const Text('Expense Claims', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/expense-claims');
            },
          ),
          ListTile(
            leading: const Icon(Icons.money, color: AppColors.textPrimary),
            title: const Text('Loans Management', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/loans');
            },
          ),
          ListTile(
            leading: const Icon(Icons.category, color: AppColors.textPrimary),
            title: const Text('Loan Products', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/loans/products');
            },
          ),
          ListTile(
            leading: const Icon(Icons.groups, color: AppColors.textPrimary),
            title: const Text('Meetings Management', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/meetings');
            },
          ),
          ListTile(
            leading: const Icon(Icons.account_tree, color: AppColors.textPrimary),
            title: const Text('Payment Products', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/payment-products');
            },
          ),
          ListTile(
            leading: const Icon(Icons.gavel, color: AppColors.textPrimary),
            title: const Text('Penalties', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/penalties');
            },
          ),
          ListTile(
            leading: const Icon(Icons.inventory, color: AppColors.textPrimary),
            title: const Text('Assets', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/assets');
            },
          ),
          ListTile(
            leading: const Icon(Icons.history, color: AppColors.textPrimary),
            title: const Text('Audit Logs', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/audit');
            },
          ),
          ListTile(
            leading: const Icon(Icons.sms, color: AppColors.textPrimary),
            title: const Text('SMS Logs', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/sms-logs');
            },
          ),
          ListTile(
            leading: const Icon(Icons.pie_chart, color: AppColors.textPrimary),
            title: const Text('Reports', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/admin/reports');
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.person, color: AppColors.textPrimary),
            title: const Text('My Profile', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(context);
              context.push('/profile');
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.negative),
            title: Text('Logout', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.negative)),
            onTap: () {
              Navigator.pop(context);
              ref.read(authControllerProvider.notifier).logout();
            },
          ),
        ],
      ),
    );
  }
}
