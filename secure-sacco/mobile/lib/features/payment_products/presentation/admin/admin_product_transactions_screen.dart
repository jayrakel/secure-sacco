import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/payment_product_dto.dart';
import '../../data/payment_product_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';

class AdminProductTransactionsScreen extends ConsumerWidget {
  final String productId;

  const AdminProductTransactionsScreen({super.key, required this.productId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transactionsAsync = ref.watch(productTransactionsProvider(productId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Transactions', style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primary),
      ),
      body: transactionsAsync.when(
        data: (page) => _buildTransactionList(context, page),
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, stack) => ErrorStateView(
          message: error.toString(),
          onRetry: () => ref.refresh(productTransactionsProvider(productId)),
        ),
      ),
    );
  }

  Widget _buildTransactionList(BuildContext context, ProductTransactionPage page) {
    if (page.items.isEmpty) {
      return Center(
        child: Text('No transactions found.', style: AppTextStyles.bodyLarge),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          color: AppColors.primary.withValues(alpha: 0.1),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Total Received', style: AppTextStyles.bodySmall),
              const SizedBox(height: AppSpacing.xs),
              Text('KES ${NumberFormat('#,##0.00').format(page.totalAmount)}', style: AppTextStyles.h2.copyWith(color: AppColors.primary)),
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: page.items.length,
            separatorBuilder: (context, index) => const Divider(),
            itemBuilder: (context, index) {
              final tx = page.items[index];
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(tx.memberName.isNotEmpty ? tx.memberName : 'Unknown Member', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tx.memberNumber, style: AppTextStyles.bodySmall),
                    Text(DateFormat('dd MMM yyyy, HH:mm').format(tx.createdAt.toLocal()), style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    Text('Ref: ${tx.reference}', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('KES ${NumberFormat('#,##0.00').format(tx.amount)}', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold, color: AppColors.positive)),
                    const SizedBox(height: 4),
                    _buildStatusBadge(tx.status),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color textColor;
    
    switch (status.toUpperCase()) {
      case 'ROUTED':
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
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(status, style: AppTextStyles.bodySmall.copyWith(color: textColor, fontSize: 10)),
    );
  }
}
