import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../data/dashboard_providers.dart';
import '../../auth/data/auth_state.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/error_state_view.dart';
import '../../payments/presentation/payment_bottom_sheet.dart';
import '../../../shared/widgets/authenticated_avatar.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metricsAsyncValue = ref.watch(dashboardMetricsProvider);
    final transactionsAsyncValue = ref.watch(recentTransactionsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      drawer: Drawer(
        backgroundColor: AppColors.surface,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: AppColors.primary),
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
                  metricsAsyncValue.maybeWhen(
                    data: (metrics) => Text(
                      metrics.memberName ?? 'Member',
                      style: AppTextStyles.h3.copyWith(color: Colors.white),
                    ),
                    orElse: () => Text('Member', style: AppTextStyles.h3.copyWith(color: Colors.white)),
                  ),
                  metricsAsyncValue.maybeWhen(
                    data: (metrics) => Text(
                      metrics.memberNumber ?? '',
                      style: AppTextStyles.bodySmall.copyWith(color: Colors.white70),
                    ),
                    orElse: () => const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard, color: AppColors.textPrimary),
              title: const Text('Dashboard', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.savings, color: AppColors.textPrimary),
              title: const Text('My Savings', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/savings');
              },
            ),
            ListTile(
              leading: const Icon(Icons.account_balance_wallet_outlined, color: AppColors.textPrimary),
              title: const Text('My Savings Obligations', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/obligations');
              },
            ),
            ListTile(
              leading: const Icon(Icons.monetization_on_outlined, color: AppColors.textPrimary),
              title: const Text('My Loans', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/loans');
              },
            ),
            ListTile(
              leading: const Icon(Icons.handshake_outlined, color: AppColors.textPrimary),
              title: const Text('Guarantor Requests', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/guarantor-requests');
              },
            ),
            ListTile(
              leading: const Icon(Icons.payment, color: AppColors.textPrimary),
              title: const Text('My Deposits', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/deposits');
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt, color: AppColors.textPrimary),
              title: const Text('My Expense Claims', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/expense-claims');
              },
            ),
            ListTile(
              leading: const Icon(Icons.groups, color: AppColors.textPrimary),
              title: const Text('My Meetings', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/meetings');
              },
            ),
            ListTile(
              leading: const Icon(Icons.gavel, color: AppColors.textPrimary),
              title: const Text('My Penalties', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/penalties');
              },
            ),
            ListTile(
              leading: const Icon(Icons.pie_chart, color: AppColors.textPrimary),
              title: const Text('My Summary', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/reports/summary');
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long, color: AppColors.textPrimary),
              title: const Text('My Statement', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(context);
                context.push('/member/reports/statement');
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
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(dashboardMetricsProvider);
          ref.invalidate(recentTransactionsProvider);
          try { await ref.read(dashboardMetricsProvider.future); } catch (_) {}
          try { await ref.read(recentTransactionsProvider.future); } catch (_) {}
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverAppBar(
              expandedHeight: 140.0,
              floating: false,
              pinned: true,
              backgroundColor: AppColors.primary,
              actions: [
                IconButton(
                  icon: const Icon(Icons.person, color: Colors.white),
                  onPressed: () {
                    context.push('/profile');
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.logout, color: Colors.white),
                  onPressed: () {
                    ref.read(authControllerProvider.notifier).logout();
                  },
                )
              ],
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: const EdgeInsets.only(left: 16.0, bottom: 16.0, right: 48.0),
                title: metricsAsyncValue.maybeWhen(
                  data: (metrics) => Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hi, ${metrics.memberName?.split(' ').first ?? 'Member'}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (metrics.memberNumber != null)
                        Text(
                          metrics.memberNumber!,
                          style: TextStyle(
                            color: Colors.white.withAlpha((0.8 * 255).toInt()),
                            fontSize: 12,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                    ],
                  ),
                  orElse: () => const Text('Dashboard', style: TextStyle(color: Colors.white)),
                ),
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [AppColors.primaryDark, AppColors.primary],
                    ),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: metricsAsyncValue.when(
                loading: () => const Padding(
                  padding: EdgeInsets.all(AppSpacing.xxl),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (err, stack) => ErrorStateView.network(
                  onRetry: () => ref.invalidate(dashboardMetricsProvider),
                ),
                data: (metrics) => Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Primary Savings Card
                      _buildPrimarySavingsCard(context, metrics.savingsBalance, metrics.totalDeposited),
                      const SizedBox(height: AppSpacing.md),
                      // Financial Overview
                      Row(
                        children: [
                          Expanded(
                            child: _buildOverviewCard(
                              context,
                              title: 'Outstanding Loan',
                              value: 'KES ${_formatCurrency(metrics.loanOutstanding)}',
                              icon: Icons.monetization_on_outlined,
                              color: AppColors.warning,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _buildOverviewCard(
                              context,
                              title: 'Next Installment',
                              value: metrics.nextInstallmentAmount != null 
                                ? 'KES ${_formatCurrency(metrics.nextInstallmentAmount!)}' 
                                : 'None',
                              icon: Icons.event_available_outlined,
                              color: AppColors.info,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Row(
                        children: [
                          Expanded(
                            child: _buildOverviewCard(
                              context,
                              title: 'Upcoming Meeting',
                              value: metrics.upcomingMeetingTitle ?? 'None Scheduled',
                              icon: Icons.event,
                              color: AppColors.primary,
                              subtitle: metrics.upcomingMeetingStartAt != null
                                  ? _formatDate(metrics.upcomingMeetingStartAt!)
                                  : null,
                              onTap: metrics.upcomingMeetingId != null
                                  ? () => context.push('/member/meetings')
                                  : null,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _buildOverviewCard(
                              context,
                              title: 'Attendance',
                              value: metrics.attendanceRate != null 
                                ? '${metrics.attendanceRate}%' 
                                : 'N/A',
                              icon: Icons.check_circle_outline,
                              color: (metrics.attendanceRate ?? 0) >= 75 ? AppColors.positive : AppColors.warning,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      ElevatedButton.icon(
                        onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (context) => PaymentBottomSheet(
                              amount: metrics.nextInstallmentAmount ?? 1000.0,
                              accountReference: metrics.memberNumber ?? 'MEMBER',
                            ),
                          );
                        },
                        icon: const Icon(Icons.payment, color: Colors.white),
                        label: const Text(
                          'Pay via M-Pesa',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade600,
                          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.lg, AppSpacing.md, AppSpacing.sm),
                child: Text(
                  'Recent Transactions',
                  style: AppTextStyles.h3,
                ),
              ),
            ),
            transactionsAsyncValue.when(
              loading: () => const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.xxl),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (err, stack) => SliverToBoxAdapter(
                child: ErrorStateView.network(
                  onRetry: () => ref.invalidate(recentTransactionsProvider),
                ),
              ),
              data: (statement) {
                if (statement.items.isEmpty) {
                  return const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(AppSpacing.xxl),
                      child: Center(
                        child: Text(
                          'No recent transactions.',
                          style: AppTextStyles.bodyMedium,
                        ),
                      ),
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = statement.items[index];
                        final isLast = index == (statement.items.length > 10 ? 9 : statement.items.length - 1);
                        return Column(
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.vertical(
                                  top: index == 0 ? const Radius.circular(AppSpacing.borderRadiusMd) : Radius.zero,
                                  bottom: isLast ? const Radius.circular(AppSpacing.borderRadiusMd) : Radius.zero,
                                ),
                                border: Border.all(color: AppColors.border, width: 0.5),
                              ),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: _getAvatarColor(item.type).withAlpha((0.1 * 255).toInt()),
                                  child: Icon(_getAvatarIcon(item.type), color: _getAvatarColor(item.type)),
                                ),
                                title: Text(
                                  item.description ?? item.type ?? 'Transaction',
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 2),
                                    Text(
                                      _formatDate(item.date),
                                      style: AppTextStyles.bodySmall,
                                    ),
                                    if (item.reference != null)
                                      Text(
                                        'Ref: ${item.reference}',
                                        style: AppTextStyles.bodySmall.copyWith(fontSize: 10),
                                      ),
                                  ],
                                ),
                                trailing: Text(
                                  '${item.amount > 0 ? '+' : ''}${_formatCurrency(item.amount)}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: item.amount > 0 ? AppColors.positive : AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ),
                            if (!isLast)
                              const Divider(height: 0, indent: 72, endIndent: 16),
                          ],
                        );
                      },
                      childCount: statement.items.length > 10 ? 10 : statement.items.length,
                    ),
                  ),
                );
              },
            ),
            const SliverPadding(padding: EdgeInsets.only(bottom: AppSpacing.xxl)),
          ],
        ),
      ),
    );
  }

  Widget _buildPrimarySavingsCard(BuildContext context, double balance, double deposited) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withAlpha((0.3 * 255).toInt()),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Savings Balance',
            style: TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'KES ${_formatCurrency(balance)}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Total Deposited', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  Text('KES ${_formatCurrency(deposited)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ],
              ),
              const Icon(Icons.savings_outlined, color: Colors.white54, size: 32),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildOverviewCard(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    String? subtitle,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: AppSpacing.sm),
            Text(title, style: AppTextStyles.bodySmall),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: AppTextStyles.bodySmall.copyWith(fontSize: 11, color: AppColors.textSecondary),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatCurrency(double amount) {
    // A simple formatter for KES (e.g. 1043696.0 -> 1,043,696.00)
    // In a real app we'd use the intl package, but to avoid introducing new dependencies 
    // unnecessarily in this Phase, we use a basic regex approach.
    String numStr = amount.toStringAsFixed(2);
    return numStr.replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
  }

  String _formatDate(String? isoDate) {
    if (isoDate == null) return '';
    try {
      final date = DateTime.parse(isoDate);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    } catch (_) {
      return isoDate;
    }
  }

  Color _getAvatarColor(String? type) {
    if (type == null) return AppColors.textSecondary;
    if (type.toLowerCase().contains('deposit')) return AppColors.positive;
    if (type.toLowerCase().contains('loan')) return AppColors.warning;
    if (type.toLowerCase().contains('withdrawal')) return AppColors.negative;
    return AppColors.info;
  }

  IconData _getAvatarIcon(String? type) {
    if (type == null) return Icons.receipt_long;
    if (type.toLowerCase().contains('deposit')) return Icons.arrow_downward_rounded;
    if (type.toLowerCase().contains('withdrawal')) return Icons.arrow_upward_rounded;
    if (type.toLowerCase().contains('loan')) return Icons.monetization_on_outlined;
    return Icons.receipt_long;
  }
}
