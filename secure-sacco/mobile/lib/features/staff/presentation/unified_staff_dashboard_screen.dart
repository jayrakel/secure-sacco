import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../dashboard/data/dashboard_providers.dart';
import '../../dashboard/presentation/widgets/dashboard_stat_card.dart';
import '../../dashboard/presentation/widgets/coop_account_balance_card.dart';
import '../../dashboard/presentation/widgets/coop_transactions_card.dart';
import '../../admin/presentation/widgets/admin_drawer.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../auth/data/auth_state.dart';
import '../../dashboard/data/staff_dashboard_dto.dart';

class UnifiedStaffDashboardScreen extends ConsumerWidget {
  const UnifiedStaffDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsyncValue = ref.watch(staffDashboardProvider);
    final authState = ref.watch(authControllerProvider);
    final permissions = authState.permissions;
    final currencyFormatter = NumberFormat.currency(symbol: 'KES ', decimalDigits: 2);

    return Scaffold(
      backgroundColor: AppColors.background,
      drawer: const AdminDrawer(),
      body: RefreshIndicator(
        onRefresh: () async {
          return ref.refresh(staffDashboardProvider.future);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverAppBar(
              expandedHeight: 120.0,
              floating: false,
              pinned: true,
              backgroundColor: AppColors.primary,
              iconTheme: const IconThemeData(color: Colors.white),
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: const EdgeInsets.only(left: 60.0, bottom: 16.0),
                title: const Text(
                  'Staff Dashboard',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
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
            dashboardAsyncValue.when(
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, stackTrace) => SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.negative, size: 48),
                      const SizedBox(height: AppSpacing.sm),
                      const Text('Failed to load dashboard', style: AppTextStyles.h3),
                      const SizedBox(height: AppSpacing.xs),
                      Text(error.toString(), style: AppTextStyles.bodySmall, textAlign: TextAlign.center),
                      const SizedBox(height: AppSpacing.md),
                      ElevatedButton(
                        onPressed: () => ref.refresh(staffDashboardProvider.future),
                        child: const Text('Retry'),
                      )
                    ],
                  ),
                ),
              ),
              data: (data) => SliverPadding(
                padding: const EdgeInsets.all(AppSpacing.md),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    if (permissions.contains('ACCOUNTING_READ') || authState.roles.contains('ROLE_SYSTEM_ADMIN'))
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: AppSpacing.md),
                        child: CoopAccountBalanceCard(),
                      ),
                    
                    const SizedBox(height: AppSpacing.lg),
                    if (permissions.contains('ACCOUNTING_READ') || authState.roles.contains('ROLE_SYSTEM_ADMIN'))
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: AppSpacing.md),
                        child: CoopTransactionsCard(),
                      ),
                    
                    const SizedBox(height: AppSpacing.lg),
                    _buildQuickLinks(context),
                    if (authState.roles.contains('ROLE_SYSTEM_ADMIN'))
                      ..._buildOverviewSection(context, data, currencyFormatter),
                    
                    if (permissions.contains('MEMBERS_READ') || permissions.contains('MEMBERS_WRITE'))
                      ..._buildMembershipSection(context, data),
                      
                    if (permissions.contains('LOANS_READ'))
                      ..._buildLoansSection(context, data, currencyFormatter),
                      
                    if (permissions.contains('SAVINGS_READ') || permissions.contains('SAVINGS_MANUAL_POST'))
                      ..._buildSavingsSection(context, data, currencyFormatter),
                      
                    if (permissions.contains('PENALTIES_WAIVE_ADJUST') || permissions.contains('PENALTIES_MANAGE_RULES'))
                      ..._buildPenaltiesSection(context, data, currencyFormatter),
                      
                    if (permissions.contains('MEETINGS_READ') || permissions.contains('MEETINGS_MANAGE'))
                      ..._buildMeetingsSection(context, data),
                      
                    if (permissions.contains('REPORTS_READ') || permissions.contains('GL_TRIAL_BALANCE'))
                      ..._buildReportsFinanceSection(context, data, currencyFormatter),



                    const SizedBox(height: AppSpacing.xxl),
                  ]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildQuickLinks(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Quick Access'),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
            border: Border.all(color: AppColors.border, width: 0.5),
          ),
          child: GridView.count(
            crossAxisCount: 3,
            crossAxisSpacing: AppSpacing.sm,
            mainAxisSpacing: AppSpacing.sm,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.0,
            children: [
              _buildQuickLinkItem(context, 'Members', Icons.people, Colors.blue, '/admin/members'),
              _buildQuickLinkItem(context, 'Loans', Icons.monetization_on, Colors.purple, '/admin/loans'),
              _buildQuickLinkItem(context, 'Savings', Icons.savings, Colors.green, '/admin/savings'),
              _buildQuickLinkItem(context, 'Meetings', Icons.calendar_today, Colors.orange, '/admin/meetings'),
              _buildQuickLinkItem(context, 'Penalties', Icons.receipt, Colors.pink, '/admin/penalties'),
              _buildQuickLinkItem(context, 'Assets', Icons.inventory, Colors.grey, '/assets'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuickLinkItem(BuildContext context, String label, IconData icon, Color color, String route) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push(route),
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withAlpha((0.1 * 255).toInt()),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(label, style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md, top: AppSpacing.lg),
      child: Text(title, style: AppTextStyles.h2),
    );
  }

  List<Widget> _buildOverviewSection(BuildContext context, StaffDashboardDto data, NumberFormat fmt) {
    return [
      _buildSectionTitle('SACCO Overview'),
      GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.4,
        children: [
          DashboardStatCard(title: 'Sacco Net Worth', value: fmt.format(data.netWorth), icon: Icons.trending_up, iconColor: Colors.blue),
          DashboardStatCard(title: 'Total Members', value: data.totalMembers.toString(), icon: Icons.people, iconColor: Colors.teal, onTap: () => context.push('/admin/members')),
          DashboardStatCard(title: 'Total Savings', value: fmt.format(data.totalSavings), icon: Icons.account_balance_wallet, iconColor: Colors.green, onTap: () => context.push('/admin/savings')),
          DashboardStatCard(title: 'Loan Portfolio', value: fmt.format(data.loanPortfolio), icon: Icons.monetization_on, iconColor: Colors.purple, onTap: () => context.push('/admin/loans')),
        ],
      ),
    ];
  }

  List<Widget> _buildMembershipSection(BuildContext context, StaffDashboardDto data) {
    return [
      _buildSectionTitle('Membership'),
      GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.4,
        children: [
          DashboardStatCard(title: 'Total Members', value: data.totalMembers.toString(), icon: Icons.people, iconColor: Colors.blue, onTap: () => context.push('/admin/members')),
          DashboardStatCard(title: 'Active Members', value: data.activeMembers.toString(), icon: Icons.check_circle, iconColor: AppColors.positive),
          DashboardStatCard(title: 'Pending Activation', value: data.pendingActivations.toString(), icon: Icons.hourglass_empty, iconColor: AppColors.warning, valueColor: data.pendingActivations > 0 ? AppColors.warning : null, onTap: () => context.push('/admin/members')),
          DashboardStatCard(title: 'Upcoming Meetings', value: data.upcomingMeetings.toString(), icon: Icons.event, iconColor: Colors.purple, onTap: () => context.push('/admin/meetings')),
        ],
      ),
    ];
  }

  List<Widget> _buildLoansSection(BuildContext context, StaffDashboardDto data, NumberFormat fmt) {
    return [
      _buildSectionTitle('Loans'),
      GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.4,
        children: [
          DashboardStatCard(title: 'Active Loans', value: data.activeLoans.toString(), icon: Icons.monetization_on, iconColor: Colors.blue, onTap: () => context.push('/admin/loans')),
          DashboardStatCard(title: 'Pending Applications', value: data.pendingLoanApplications.toString(), icon: Icons.assignment, iconColor: AppColors.warning, valueColor: data.pendingLoanApplications > 0 ? AppColors.warning : null, onTap: () => context.push('/admin/loans')),
          DashboardStatCard(title: 'Loans in Arrears', value: data.loansInArrears.toString(), icon: Icons.trending_down, iconColor: AppColors.negative, valueColor: data.loansInArrears > 0 ? AppColors.negative : null),
          DashboardStatCard(title: 'Loan Portfolio', value: fmt.format(data.loanPortfolio), icon: Icons.account_balance, iconColor: Colors.green),
        ],
      ),
    ];
  }

  List<Widget> _buildSavingsSection(BuildContext context, StaffDashboardDto data, NumberFormat fmt) {
    return [
      _buildSectionTitle('Savings'),
      GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.4,
        children: [
          DashboardStatCard(title: 'Total Savings Pool', value: fmt.format(data.totalSavings), icon: Icons.savings, iconColor: Colors.green, onTap: () => context.push('/admin/savings')),
          DashboardStatCard(title: 'Today\'s Collections', value: fmt.format(data.todaysCollections), icon: Icons.payments, iconColor: Colors.blue),
          DashboardStatCard(title: 'Active Members', value: data.activeMembers.toString(), icon: Icons.people, iconColor: Colors.grey),
        ],
      ),
    ];
  }

  List<Widget> _buildPenaltiesSection(BuildContext context, StaffDashboardDto data, NumberFormat fmt) {
    return [
      _buildSectionTitle('Penalties'),
      GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.4,
        children: [
          DashboardStatCard(title: 'Open Penalties', value: data.openPenalties.toString(), icon: Icons.warning, iconColor: AppColors.negative, valueColor: data.openPenalties > 0 ? AppColors.negative : null, onTap: () => context.push('/admin/penalties')),
          DashboardStatCard(title: 'Outstanding Amount', value: fmt.format(data.outstandingPenalties), icon: Icons.receipt, iconColor: Colors.pink, onTap: () => context.push('/admin/penalties')),
          DashboardStatCard(title: 'Loans in Arrears', value: data.loansInArrears.toString(), icon: Icons.trending_down, iconColor: AppColors.warning),
        ],
      ),
    ];
  }

  List<Widget> _buildMeetingsSection(BuildContext context, StaffDashboardDto data) {
    return [
      _buildSectionTitle('Meetings'),
      GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.4,
        children: [
          DashboardStatCard(title: 'Upcoming Meetings', value: data.upcomingMeetings.toString(), icon: Icons.event_available, iconColor: Colors.purple, onTap: () => context.push('/admin/meetings')),
          DashboardStatCard(title: 'Meetings This Month', value: data.meetingsThisMonth.toString(), icon: Icons.calendar_month, iconColor: Colors.blue, onTap: () => context.push('/admin/meetings')),
          DashboardStatCard(title: 'Active Members', value: data.activeMembers.toString(), icon: Icons.check_circle, iconColor: Colors.green),
        ],
      ),
    ];
  }

  List<Widget> _buildReportsFinanceSection(BuildContext context, StaffDashboardDto data, NumberFormat fmt) {
    return [
      _buildSectionTitle('Reports & Finance'),
      GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.4,
        children: [
          DashboardStatCard(title: 'Total Arrears Amount', value: fmt.format(data.totalArrearsAmount), icon: Icons.warning_amber_rounded, iconColor: AppColors.warning),
          DashboardStatCard(title: 'Today\'s Collections', value: fmt.format(data.todaysCollections), icon: Icons.payments, iconColor: Colors.blue),
          DashboardStatCard(title: 'Total Savings', value: fmt.format(data.totalSavings), icon: Icons.scale, iconColor: Colors.green),
          DashboardStatCard(title: 'Loan Portfolio', value: fmt.format(data.loanPortfolio), icon: Icons.monetization_on, iconColor: Colors.purple, onTap: () => context.push('/admin/loans')),
        ],
      ),
    ];
  }
}
