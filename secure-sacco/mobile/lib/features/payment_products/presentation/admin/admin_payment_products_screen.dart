import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/payment_product_dto.dart';
import '../../data/payment_product_providers.dart';
import '../../../admin/presentation/widgets/admin_drawer.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';

class AdminPaymentProductsScreen extends ConsumerWidget {
  const AdminPaymentProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(paymentProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Payment Products', style: AppTextStyles.h2.copyWith(color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primary),
      ),
      drawer: const AdminDrawer(),
      body: productsAsync.when(
        data: (products) => _buildProductList(context, products),
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, stack) => ErrorStateView(
          message: error.toString(),
          onRetry: () => ref.refresh(paymentProductsProvider),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/admin/payment-products/new'),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: AppColors.surface),
        label: Text('New Product', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.surface, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildProductList(BuildContext context, List<ProductResponse> products) {
    if (products.isEmpty) {
      return Center(
        child: Text('No payment products configured.', style: AppTextStyles.bodyLarge),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: products.length,
      separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final product = products[index];
        return Card(
          color: AppColors.surface,
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              context.push('/admin/payment-products/${product.id}/transactions');
            },
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product.name, style: AppTextStyles.h3),
                        const SizedBox(height: AppSpacing.xs),
                        Text('Code: ${product.code} • Type: ${product.moduleType.name}', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                        if (product.requiredAmount != null) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text('Target: KES ${product.requiredAmount}', style: AppTextStyles.bodySmall.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                        ]
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (!product.isActive)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.negative.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text('INACTIVE', style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative)),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.positive.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text('ACTIVE', style: AppTextStyles.bodySmall.copyWith(color: AppColors.positive)),
                        ),
                      const SizedBox(height: AppSpacing.sm),
                      const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
