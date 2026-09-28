import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';
import '../../data/savings_providers.dart';

class MySavingsScreen extends ConsumerWidget {
  const MySavingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balanceAsync = ref.watch(mySavingsBalanceProvider);
    final statementAsync = ref.watch(mySavingsStatementProvider);
    final currencyFormatter = NumberFormat.currency(symbol: 'KES ');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('My Savings', style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primary),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(mySavingsBalanceProvider);
          ref.invalidate(mySavingsStatementProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            // Balance Card
            balanceAsync.when(
              data: (balance) => Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Available Balance', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.surface)),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      currencyFormatter.format(balance.availableBalance),
                      style: AppTextStyles.h1.copyWith(color: AppColors.surface),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                          decoration: BoxDecoration(
                            color: balance.accountStatus == 'ACTIVE' ? AppColors.positive : AppColors.negative,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            balance.accountStatus,
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.surface, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              loading: () => const SizedBox(height: 150, child: Center(child: CircularProgressIndicator())),
              error: (e, s) => ErrorStateView(message: e.toString(), onRetry: () => ref.refresh(mySavingsBalanceProvider)),
            ),
            
            const SizedBox(height: AppSpacing.lg),
            
            // Actions
            ElevatedButton.icon(
              onPressed: () => context.push('/member/deposits/new'),
              icon: const Icon(Icons.add_circle_outline),
              label: const Text('Deposit Money'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.surface,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            
            const SizedBox(height: AppSpacing.xl),
            
            // Statement
            Text('Recent Transactions', style: AppTextStyles.h3),
            const SizedBox(height: AppSpacing.sm),
            
            statementAsync.when(
              data: (statement) {
                if (statement.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(AppSpacing.xl),
                    child: Center(child: Text('No recent transactions')),
                  );
                }
                
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: statement.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final txn = statement[index];
                    final isPositive = txn.type == 'DEPOSIT' || txn.type == 'EXPENSE_REIMBURSEMENT';
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: (isPositive ? AppColors.positive : AppColors.negative).withValues(alpha: 0.1),
                        child: Icon(
                          isPositive ? Icons.arrow_downward : Icons.arrow_upward,
                          color: isPositive ? AppColors.positive : AppColors.negative,
                        ),
                      ),
                      title: Text(txn.type, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (txn.postedAt != null)
                            Text(DateFormat.yMMMd().add_jm().format(txn.postedAt!.toLocal()), style: AppTextStyles.bodySmall),
                          Text('Ref: ${txn.reference}', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                        ],
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${isPositive ? '+' : '-'}${currencyFormatter.format(txn.amount)}',
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.bold,
                              color: isPositive ? AppColors.positive : AppColors.negative,
                            ),
                          ),
                          Text(
                            txn.status,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: txn.status == 'POSTED' ? AppColors.positive : AppColors.warning,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => ErrorStateView(message: e.toString(), onRetry: () => ref.refresh(mySavingsStatementProvider)),
            ),
          ],
        ),
      ),
    );
  }
}
