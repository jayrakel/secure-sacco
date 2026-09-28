import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../data/payment_product_dto.dart';
import '../../data/payment_product_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';

class MemberDepositHistoryScreen extends ConsumerWidget {
  const MemberDepositHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(recentSplitDepositsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Deposit History', style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primary),
      ),
      body: historyAsync.when(
        data: (items) => _buildHistoryList(context, items),
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, s) => ErrorStateView(message: e.toString(), onRetry: () => ref.refresh(recentSplitDepositsProvider)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/member/deposits/new'),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: AppColors.surface),
        label: Text('New Deposit', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.surface, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildHistoryList(BuildContext context, List<SplitDepositHistoryItem> items) {
    if (items.isEmpty) {
      return Center(
        child: Text('No deposit history found.', style: AppTextStyles.bodyLarge),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: items.length,
      separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          color: AppColors.surface,
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(DateFormat('dd MMM yyyy, HH:mm').format(item.createdAt.toLocal()), style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    _buildStatusBadge(item.status),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total Amount', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                    Text('KES ${NumberFormat('#,##0.00').format(item.totalAmount)}', style: AppTextStyles.h3.copyWith(color: AppColors.primary)),
                  ],
                ),
                if (item.accountReference.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text('Ref: ${item.accountReference}', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                ],
                if (item.failureReason != null) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text('Error: ${item.failureReason}', style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative)),
                ],
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
                  child: Divider(),
                ),
                Text('Allocations', style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: AppSpacing.xs),
                ...item.allocations.map((alloc) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(alloc.productName, style: AppTextStyles.bodySmall),
                      Text('KES ${NumberFormat('#,##0.00').format(alloc.amount)}', style: AppTextStyles.bodySmall),
                    ],
                  ),
                )),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color textColor;
    
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
        bgColor = AppColors.positive.withValues(alpha: 0.1);
        textColor = AppColors.positive;
        break;
      case 'PENDING':
        bgColor = Colors.orange.withValues(alpha: 0.1);
        textColor = Colors.orange;
        break;
      case 'FAILED':
        bgColor = AppColors.negative.withValues(alpha: 0.1);
        textColor = AppColors.negative;
        break;
      default:
        bgColor = Colors.grey.withValues(alpha: 0.1);
        textColor = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(status, style: AppTextStyles.bodySmall.copyWith(color: textColor, fontWeight: FontWeight.bold)),
    );
  }
}
