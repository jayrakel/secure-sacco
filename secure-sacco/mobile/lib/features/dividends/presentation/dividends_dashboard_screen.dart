import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../data/dividend_providers.dart';

class DividendsDashboardScreen extends ConsumerWidget {
  const DividendsDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final declarationsAsync = ref.watch(dividendDeclarationsProvider);
    final currencyFormatter = NumberFormat.currency(symbol: 'KES ', decimalDigits: 2);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Dividends Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Declare Dividend',
            onPressed: () => context.push('/admin/dividends/declare'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/admin/dividends/declare'),
        icon: const Icon(Icons.add),
        label: const Text('Declare'),
        backgroundColor: AppColors.primary,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          return ref.refresh(dividendDeclarationsProvider.future);
        },
        child: declarationsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: AppColors.negative, size: 48),
                const SizedBox(height: AppSpacing.sm),
                const Text('Failed to load dividends', style: AppTextStyles.h3),
                const SizedBox(height: AppSpacing.xs),
                Text(error.toString(), style: AppTextStyles.bodySmall, textAlign: TextAlign.center),
                const SizedBox(height: AppSpacing.md),
                ElevatedButton(
                  onPressed: () => ref.refresh(dividendDeclarationsProvider.future),
                  child: const Text('Retry'),
                )
              ],
            ),
          ),
          data: (declarations) {
            if (declarations.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 100),
                  Center(
                    child: Text(
                      'No dividends declared yet.',
                      style: AppTextStyles.h3,
                    ),
                  ),
                ],
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: declarations.length,
              itemBuilder: (context, index) {
                final declaration = declarations[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(AppSpacing.md),
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                      child: const Icon(Icons.monetization_on, color: AppColors.primary),
                    ),
                    title: Text(
                      'FY ${declaration.financialYear}',
                      style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text('Rate: ${declaration.ratePercentage}%'),
                        Text('Mode: ${declaration.calculationMode}'),
                        const SizedBox(height: 4),
                        Text(
                          'Total: ${currencyFormatter.format(declaration.totalAllocated)}',
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.positive),
                        ),
                      ],
                    ),
                    trailing: Chip(
                      label: Text(
                        declaration.status,
                        style: const TextStyle(fontSize: 12, color: Colors.white),
                      ),
                      backgroundColor: declaration.status == 'POSTED' || declaration.status == 'APPROVED' 
                          ? AppColors.positive 
                          : AppColors.warning,
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
